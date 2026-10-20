import * as Effect from "effect/Effect";

import { deriveWsBaseUrl, normalizeHttpBaseUrl } from "../environment/endpoint.ts";
import type { RemoteEnvironmentAuthError } from "../authorization/remote.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import { ConnectionBlockedError, type ConnectionAttemptError } from "./model.ts";

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/**
 * Clyde: reads the address the owner typed, such as
 * `dev-hub.example.ts.net:8443`. A Tailscale Serve address uses HTTPS, so an
 * address with no scheme gets `https://`.
 */
export const resolveTailscaleOwnerTarget = Effect.fn(
  "clientRuntime.connection.tailscaleOwner.resolveTarget",
)(function* (address: string) {
  const trimmed = address.trim();
  if (trimmed === "") {
    return yield* new ConnectionBlockedError({
      reason: "configuration",
      detail: "Enter the environment's address.",
    });
  }
  return yield* Effect.try({
    try: () => {
      const httpBaseUrl = normalizeHttpBaseUrl(
        HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`,
      );
      return { httpBaseUrl, wsBaseUrl: deriveWsBaseUrl(httpBaseUrl) };
    },
    catch: (cause) =>
      new ConnectionBlockedError({
        reason: "configuration",
        detail: cause instanceof Error ? cause.message : "The environment address is invalid.",
      }),
  });
});

export function mapTailscaleOwnerTokenError(
  error: RemoteEnvironmentAuthError,
): ConnectionAttemptError {
  if (error._tag === "EnvironmentAuthInvalidError") {
    return new ConnectionBlockedError({
      reason: "authentication",
      detail:
        error.reason === "missing_credential"
          ? "This environment did not accept a Tailscale sign-in. Use its tailnet address, or add a pairing code."
          : "This environment belongs to another tailnet user.",
      traceId: error.traceId,
      hop: "server",
      via: "direct",
    });
  }
  return mapRemoteEnvironmentError(error);
}
