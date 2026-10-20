import type { AuthClientPresentationMetadata } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { environmentEndpointUrl } from "../environment/endpoint.ts";
import { executeEnvironmentHttpRequest, makeEnvironmentHttpApiGroupClient } from "../rpc/http.ts";
import { clientMetadataTokenExchangeFields } from "./remote.ts";

const DEFAULT_REMOTE_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Clyde: asks the environment for an access token on the strength of the
 * owner's Tailscale identity, which Tailscale Serve adds to the request. It
 * returns the same token the pairing exchange returns.
 */
export const requestTailscaleOwnerAccessToken = Effect.fn(
  "clientRuntime.authorization.requestTailscaleOwnerAccessToken",
)(function* (input: {
  readonly httpBaseUrl: string;
  readonly clientMetadata?: AuthClientPresentationMetadata;
  readonly timeoutMs?: number;
}) {
  const client = yield* makeEnvironmentHttpApiGroupClient(input.httpBaseUrl, "auth");
  return yield* executeEnvironmentHttpRequest(
    environmentEndpointUrl(input.httpBaseUrl, "/api/auth/tailscale-token"),
    input.timeoutMs ?? DEFAULT_REMOTE_REQUEST_TIMEOUT_MS,
    client.tailscaleToken({
      headers: {},
      payload: clientMetadataTokenExchangeFields(input.clientMetadata),
    }),
  );
});
