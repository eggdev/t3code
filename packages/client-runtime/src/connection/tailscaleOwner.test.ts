import {
  EnvironmentId,
  EnvironmentOperationForbiddenError,
  ORCHESTRATION_PROTOCOL_VERSION,
} from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import * as ClientCapabilities from "../platform/capabilities.ts";
import * as Persistence from "../platform/persistence.ts";
import * as RpcHttp from "../rpc/http.ts";
import { BearerConnectionCredential, type ConnectionRegistration } from "./catalog.ts";
import * as Connectivity from "./connectivity.ts";
import * as ConnectionCredentialStore from "./credentialStore.ts";
import * as ConnectionDriver from "./driver.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import * as Onboarding from "./onboarding.ts";
import * as ConnectionProfileStore from "./profileStore.ts";
import * as EnvironmentRegistry from "./registry.ts";
import { resolveTailscaleOwnerTarget } from "./tailscaleOwner.ts";
import * as ConnectionWakeups from "./wakeups.ts";

const ADDRESS = "dev-hub.example.ts.net:8443";
const ORIGIN = "https://dev-hub.example.ts.net:8443";
const ENVIRONMENT_ID = EnvironmentId.make("environment-owner");

type Call = { readonly url: string; readonly init: RequestInit };

const authInvalid = (reason: string) =>
  Response.json(
    {
      _tag: "EnvironmentAuthInvalidError",
      code: "auth_invalid",
      reason,
      traceId: "trace-owner-test",
    },
    { status: 401 },
  );

function layerOwnerHttp(calls: Array<Call>, tokenResponse: () => Response) {
  const fetchFn = ((input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/.well-known/t3/environment")) {
      return Promise.resolve(
        Response.json({
          environmentId: ENVIRONMENT_ID,
          label: "Mac mini",
          platform: { os: "darwin", arch: "arm64" },
          serverVersion: "0.0.0-test",
          orchestrationProtocolVersion: ORCHESTRATION_PROTOCOL_VERSION,
          capabilities: { repositoryIdentity: true },
        }),
      );
    }
    if (url.endsWith("/api/auth/tailscale-token")) {
      return Promise.resolve(tokenResponse());
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  }) satisfies typeof fetch;
  return RpcHttp.layerRemoteHttpClient(fetchFn);
}

const ownerToken = () =>
  Response.json({
    access_token: "owner-bearer-token",
    issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
    token_type: "Bearer",
    expires_in: 3600,
    scope: "orchestration:read",
  });

function layerOnboarding(input: {
  readonly calls: Array<Call>;
  readonly registered: Array<ConnectionRegistration>;
  readonly tokenResponse: () => Response;
}) {
  const dependencies = Layer.mergeAll(
    Layer.succeed(
      ClientCapabilities.ClientPresentation,
      ClientCapabilities.ClientPresentation.of({
        metadata: { label: "Owner iPhone", deviceType: "mobile", os: "iOS" },
      }),
    ),
    layerOwnerHttp(input.calls, input.tokenResponse),
    Layer.mock(Persistence.ConnectionTargetStore)({
      list: Effect.succeed([]),
      listDisabled: Effect.succeed([]),
    }),
    Layer.mock(Persistence.ConnectionRegistrationStore)({
      register: (registration) => Effect.sync(() => void input.registered.push(registration)),
      setEnabled: () => Effect.void,
    }),
    Layer.mock(Persistence.EnvironmentCacheStore)({}),
    Layer.mock(ConnectionProfileStore.ConnectionProfileStore)({}),
    Layer.mock(ConnectionCredentialStore.ConnectionCredentialStore)({}),
    Layer.mock(ClientCapabilities.SshEnvironmentGateway)({}),
    Layer.succeed(
      Connectivity.Connectivity,
      Connectivity.Connectivity.of({ status: Effect.succeed("online"), changes: Stream.never }),
    ),
    Layer.mock(ConnectionDriver.ConnectionDriver)({ connect: () => Effect.never }),
    Layer.succeed(
      ConnectionWakeups.ConnectionWakeups,
      ConnectionWakeups.ConnectionWakeups.of({ changes: Stream.never }),
    ),
  );
  return Onboarding.layer.pipe(
    Layer.provideMerge(EnvironmentRegistry.layer.pipe(Layer.provideMerge(dependencies))),
  );
}

describe("registering an environment by its address", () => {
  it.effect("asks for an owner token and stores it as a bearer credential", () => {
    const calls: Array<Call> = [];
    const registered: Array<ConnectionRegistration> = [];
    return Effect.gen(function* () {
      const onboarding = yield* Onboarding.ConnectionOnboarding;
      const registry = yield* EnvironmentRegistry.EnvironmentRegistry;

      const environmentId = yield* onboarding.registerTailscaleOwner({ address: ADDRESS });

      expect(environmentId).toBe(ENVIRONMENT_ID);
      expect(calls.map((call) => call.url)).toEqual([
        `${ORIGIN}/.well-known/t3/environment`,
        `${ORIGIN}/api/auth/tailscale-token`,
      ]);
      const tokenCall = calls[1];
      expect(tokenCall?.init.method).toBe("POST");
      const body = new URLSearchParams(
        tokenCall?.init.body instanceof Uint8Array
          ? new TextDecoder().decode(tokenCall.init.body)
          : String(tokenCall?.init.body),
      );
      expect(body.get("client_label")).toBe("Owner iPhone");
      expect(body.get("client_device_type")).toBe("mobile");
      expect(body.has("subject_token")).toBe(false);

      const connectionId = `bearer:environment-owner:${ORIGIN}`;
      expect(registered).toHaveLength(1);
      expect(registered[0]).toMatchObject({
        _tag: "BearerConnectionRegistration",
        target: { environmentId: ENVIRONMENT_ID, label: "Mac mini", connectionId },
        profile: {
          connectionId,
          httpBaseUrl: `${ORIGIN}/`,
          wsBaseUrl: "wss://dev-hub.example.ts.net:8443/",
        },
        credential: new BearerConnectionCredential({ token: "owner-bearer-token" }),
      });
      const entry = (yield* SubscriptionRef.get(registry.entries)).get(ENVIRONMENT_ID);
      expect(entry?.enabled).toBe(true);
      expect(Option.isSome(entry?.profile ?? Option.none())).toBe(true);
    }).pipe(Effect.provide(layerOnboarding({ calls, registered, tokenResponse: ownerToken })));
  });

  it.effect("reports another tailnet user and registers nothing", () => {
    const registered: Array<ConnectionRegistration> = [];
    return Effect.gen(function* () {
      const onboarding = yield* Onboarding.ConnectionOnboarding;
      const error = yield* onboarding
        .registerTailscaleOwner({ address: ADDRESS })
        .pipe(Effect.flip);
      expect(error).toMatchObject({
        _tag: "ConnectionBlockedError",
        reason: "authentication",
        detail: "This environment belongs to another tailnet user.",
        traceId: "trace-owner-test",
      });
      expect(registered).toEqual([]);
    }).pipe(
      Effect.provide(
        layerOnboarding({
          calls: [],
          registered,
          tokenResponse: () => authInvalid("invalid_credential"),
        }),
      ),
    );
  });

  it.effect("tells the owner when the environment takes no Tailscale sign-in", () =>
    Effect.gen(function* () {
      const onboarding = yield* Onboarding.ConnectionOnboarding;
      const error = yield* onboarding
        .registerTailscaleOwner({ address: ADDRESS })
        .pipe(Effect.flip);
      expect(error.message).toContain("did not accept a Tailscale sign-in");
    }).pipe(
      Effect.provide(
        layerOnboarding({
          calls: [],
          registered: [],
          tokenResponse: () => authInvalid("missing_credential"),
        }),
      ),
    ),
  );
});

describe("resolveTailscaleOwnerTarget", () => {
  it.effect("adds HTTPS to an address with no scheme and keeps an explicit one", () =>
    Effect.gen(function* () {
      expect(yield* resolveTailscaleOwnerTarget(` ${ADDRESS}/some/path `)).toEqual({
        httpBaseUrl: `${ORIGIN}/`,
        wsBaseUrl: "wss://dev-hub.example.ts.net:8443/",
      });
      expect(yield* resolveTailscaleOwnerTarget("http://100.64.0.7:3773")).toEqual({
        httpBaseUrl: "http://100.64.0.7:3773/",
        wsBaseUrl: "ws://100.64.0.7:3773/",
      });
    }),
  );

  it.effect("refuses an empty address and a non-HTTP scheme", () =>
    Effect.gen(function* () {
      for (const address of ["  ", "ftp://dev-hub.example.ts.net"]) {
        const error = yield* resolveTailscaleOwnerTarget(address).pipe(Effect.flip);
        expect(error).toMatchObject({ _tag: "ConnectionBlockedError", reason: "configuration" });
      }
    }),
  );
});

describe("pairing in owner mode", () => {
  it("shows the server's pairing-off message", () => {
    const error = mapRemoteEnvironmentError(
      new EnvironmentOperationForbiddenError({
        code: "operation_forbidden",
        reason: "pairing_off",
        traceId: "trace-pairing-off",
      }),
    );
    expect(error.message).toBe("Pairing is off: sign in with Tailscale.");
  });
});
