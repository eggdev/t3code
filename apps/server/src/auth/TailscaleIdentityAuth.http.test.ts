import * as NodeServices from "@effect/platform-node/NodeServices";
import { EnvironmentHttpApi } from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
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
).pipe(Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "clyde-tailscale-auth-" })));

const layerRoutes = HttpApiBuilder.layer(AuthTestApi).pipe(
  Layer.provide(AuthHttp.layer),
  Layer.provide(AuthHttp.layerAuthenticatedAuth),
  Layer.provideMerge(
    EnvironmentAuth.layer.pipe(
      Layer.provide(SqlitePersistence.layerMemory),
      Layer.provide(ServerSecretStore.layer),
      Layer.provide(ServerEnvironment.layerIdentity),
      Layer.provide(layerConfig),
    ),
  ),
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
  getOrCreateRandom: () => Effect.die("Not used by the session route."),
  remove: () => Effect.void,
});

// A web Request has no socket. The route reads the peer address from the
// request source, so each test request carries the address a socket would.
const sessionRequest = (input: {
  readonly login?: string;
  readonly remoteAddress?: string;
  readonly cookie?: string;
}) =>
  Object.assign(
    new Request("http://127.0.0.1/api/auth/session", {
      headers: {
        ...(input.login ? { "tailscale-user-login": input.login } : {}),
        ...(input.cookie ? { cookie: input.cookie } : {}),
      },
    }),
    input.remoteAddress ? { remoteAddress: input.remoteAddress } : {},
  );

it.effect("signs in the owner from Tailscale Serve, and the cookie it sets authenticates", () =>
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    const requestContext = Context.make(Crypto.Crypto, crypto).pipe(
      Context.add(ServerSecretStore.ServerSecretStore, unusedSecretStore),
    );
    return yield* Effect.acquireUseRelease(
      Effect.sync(() => HttpRouter.toWebHandler(layerRoutes, { disableLogger: true })),
      (environment) =>
        Effect.tryPromise(async () => {
          const signIn = await environment.handler(
            sessionRequest({ login: OWNER, remoteAddress: "127.0.0.1" }),
            requestContext,
          );
          expect(signIn.status).toBe(200);
          expect(await signIn.json()).toMatchObject({
            authenticated: true,
            sessionMethod: "browser-session-cookie",
          });
          const cookie = signIn.headers
            .getSetCookie()
            .find((value) => value.startsWith("t3_session_"));
          expect(cookie).toContain("HttpOnly");

          const again = await environment.handler(
            sessionRequest({ cookie: cookie?.split(";", 1)[0] ?? "" }),
            requestContext,
          );
          expect(await again.json()).toMatchObject({ authenticated: true });
        }),
      (environment) => Effect.promise(() => environment.dispose()),
    );
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("refuses another login, and the owner's login from a non-loopback peer", () =>
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    const requestContext = Context.make(Crypto.Crypto, crypto).pipe(
      Context.add(ServerSecretStore.ServerSecretStore, unusedSecretStore),
    );
    return yield* Effect.acquireUseRelease(
      Effect.sync(() => HttpRouter.toWebHandler(layerRoutes, { disableLogger: true })),
      (environment) =>
        Effect.tryPromise(async () => {
          for (const request of [
            sessionRequest({ login: "other@example.com", remoteAddress: "127.0.0.1" }),
            sessionRequest({ login: OWNER, remoteAddress: "100.64.0.7" }),
            sessionRequest({ login: OWNER }),
          ]) {
            const response = await environment.handler(request, requestContext);
            expect(await response.json()).toMatchObject({ authenticated: false });
            expect(response.headers.getSetCookie()).toEqual([]);
          }
        }),
      (environment) => Effect.promise(() => environment.dispose()),
    );
  }).pipe(Effect.provide(NodeServices.layer)),
);
