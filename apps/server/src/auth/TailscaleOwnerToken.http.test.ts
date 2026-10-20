import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  AuthAccessTokenType,
  AuthEnvironmentBootstrapTokenType,
  AuthTokenExchangeGrantType,
  EnvironmentHttpApi,
} from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Etag from "effect/http/Etag";
import * as HttpPlatform from "effect/http/HttpPlatform";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpRouter from "effect/http/HttpRouter";

import * as ServerConfig from "../config.ts";
import * as ServerEnvironment from "../environment/ServerEnvironment.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as EnvironmentAuth from "./EnvironmentAuth.ts";
import * as ServerSecretStore from "./ServerSecretStore.ts";
import * as AuthHttp from "./http.ts";

const OWNER = "owner@example.com";
class AuthTestApi extends HttpApi.make("environment").add(EnvironmentHttpApi.groups.auth) {}

const layerConfig = Layer.effect(
  ServerConfig.ServerConfig,
  Effect.gen(function* () {
    const config = yield* ServerConfig.ServerConfig;
    return {
      ...config,
      mode: "web",
      tailscaleOwnerLogin: OWNER,
    } satisfies ServerConfig.ServerConfig["Service"];
  }),
).pipe(Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "clyde-tailscale-token-" })));

const layerEnvironmentAuth = EnvironmentAuth.layer.pipe(
  Layer.provide(SqlitePersistence.layerMemory),
  Layer.provide(ServerSecretStore.layer),
  Layer.provide(ServerEnvironment.layerIdentity),
  Layer.provide(layerConfig),
);

const layerRoutes = HttpApiBuilder.layer(AuthTestApi).pipe(
  Layer.provide(AuthHttp.layer),
  Layer.provide(AuthHttp.layerAuthenticatedAuth),
  Layer.provideMerge(layerEnvironmentAuth),
  Layer.provide(layerConfig),
  Layer.provideMerge(
    HttpPlatform.layer.pipe(
      Layer.provideMerge(NodeServices.layer),
      Layer.provideMerge(Etag.layerWeak),
    ),
  ),
  Layer.provide(NodeServices.layer),
);

const unusedSecretStore = ServerSecretStore.ServerSecretStore.of({
  get: () => Effect.succeedNone,
  set: () => Effect.void,
  create: () => Effect.void,
  getOrCreateRandom: () => Effect.die("Not used by these routes."),
  remove: () => Effect.void,
});

const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));

// A web Request has no socket. The routes read the peer address from the
// request source, so each request carries the address a socket would.
const withPeer = (request: Request, remoteAddress: string | undefined) =>
  Object.assign(request, remoteAddress ? { remoteAddress } : {});

const tokenRequest = (input: {
  readonly login?: string;
  readonly remoteAddress?: string;
  readonly dpop?: string;
}) =>
  withPeer(
    new Request("http://127.0.0.1/api/auth/tailscale-token", {
      method: "POST",
      headers: {
        ...(input.login ? { "tailscale-user-login": input.login } : {}),
        ...(input.dpop ? { dpop: input.dpop } : {}),
      },
      body: new URLSearchParams({ client_label: "Owner iPhone", client_device_type: "mobile" }),
    }),
    input.remoteAddress,
  );

const withRoutes = (use: (handle: (request: Request) => Promise<Response>) => Promise<void>) =>
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    const requestContext = Context.make(Crypto.Crypto, crypto).pipe(
      Context.add(ServerSecretStore.ServerSecretStore, unusedSecretStore),
    );
    return yield* Effect.acquireUseRelease(
      Effect.sync(() => HttpRouter.toWebHandler(layerRoutes, { disableLogger: true })),
      (environment) =>
        Effect.tryPromise(() => use((request) => environment.handler(request, requestContext))),
      (environment) => Effect.promise(() => environment.dispose()),
    );
  }).pipe(Effect.provide(NodeServices.layer));

it.effect("issues the owner a bearer token that authenticates a WebSocket ticket request", () =>
  withRoutes(async (handle) => {
    const response = await handle(tokenRequest({ login: OWNER, remoteAddress: "127.0.0.1" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const token = (await response.json()) as {
      access_token: string;
      token_type: string;
      issued_token_type: string;
      expires_in: number;
      scope: string;
    };
    expect(token.token_type).toBe("Bearer");
    expect(token.issued_token_type).toBe(AuthAccessTokenType);
    expect(token.expires_in).toBeGreaterThan(0);
    expect(token.scope).toContain("orchestration:read");

    const ticket = await handle(
      new Request("http://127.0.0.1/api/auth/websocket-ticket", {
        method: "POST",
        headers: { authorization: `Bearer ${token.access_token}` },
      }),
    );
    expect(ticket.status).toBe(200);
    expect(await ticket.json()).toMatchObject({ ticket: expect.any(String) });

    const clients = await handle(
      new Request("http://127.0.0.1/api/auth/clients", {
        headers: { authorization: `Bearer ${token.access_token}` },
      }),
    );
    expect(await clients.json()).toContainEqual(
      expect.objectContaining({
        current: true,
        method: "bearer-access-token",
        client: expect.objectContaining({ label: "Owner iPhone", deviceType: "mobile" }),
      }),
    );
  }),
);

it.effect("refuses another login, a non-loopback peer, a missing header and a bad proof", () =>
  withRoutes(async (handle) => {
    for (const [request, reason] of [
      [
        tokenRequest({ login: "other@example.com", remoteAddress: "127.0.0.1" }),
        "invalid_credential",
      ],
      [tokenRequest({ login: OWNER, remoteAddress: "100.64.0.7" }), "invalid_credential"],
      [tokenRequest({ login: OWNER }), "invalid_credential"],
      [tokenRequest({ remoteAddress: "127.0.0.1" }), "missing_credential"],
      [
        tokenRequest({ login: OWNER, remoteAddress: "127.0.0.1", dpop: "not-a-proof" }),
        "invalid_credential",
      ],
    ] as const) {
      const response = await handle(request);
      expect(response.status).toBe(401);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toMatchObject({ code: "auth_invalid", reason });
      expect(body).not.toHaveProperty("access_token");
    }
  }),
);

it.effect("refuses to issue or spend pairing grants in owner mode", () =>
  withRoutes(async (handle) => {
    const exchange = await handle(
      new Request("http://127.0.0.1/oauth/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: AuthTokenExchangeGrantType,
          subject_token: "ABCDEFGHJKLM",
          subject_token_type: AuthEnvironmentBootstrapTokenType,
          requested_token_type: AuthAccessTokenType,
        }),
      }),
    );
    expect(exchange.status).toBe(403);
    expect(await exchange.json()).toMatchObject({
      code: "operation_forbidden",
      reason: "pairing_off",
    });

    const browserSession = await handle(
      new Request("http://127.0.0.1/api/auth/browser-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: encodeJson({ credential: "ABCDEFGHJKLM" }),
      }),
    );
    expect(browserSession.status).toBe(403);
    expect(await browserSession.json()).toMatchObject({ reason: "pairing_off" });

    const owner = (await (
      await handle(tokenRequest({ login: OWNER, remoteAddress: "127.0.0.1" }))
    ).json()) as { access_token: string };
    const issuance = await handle(
      new Request("http://127.0.0.1/api/auth/pairing-token", {
        method: "POST",
        headers: {
          authorization: `Bearer ${owner.access_token}`,
          "content-type": "application/json",
        },
        body: encodeJson({}),
      }),
    );
    expect(issuance.status).toBe(403);
    expect(await issuance.json()).toMatchObject({ reason: "pairing_off" });
  }),
);

it.effect("refuses pairing grants from the CLI and startup paths in owner mode", () =>
  Effect.gen(function* () {
    const auth = yield* EnvironmentAuth.EnvironmentAuth;
    const created = yield* Effect.flip(auth.createPairingLink());
    expect(created.message).toBe("Pairing is off: sign in with Tailscale.");
    const startup = yield* Effect.flip(auth.issueStartupPairingCredential());
    expect(startup.message).toBe("Pairing is off: sign in with Tailscale.");
  }).pipe(Effect.provide(layerEnvironmentAuth), Effect.provide(NodeServices.layer)),
);
