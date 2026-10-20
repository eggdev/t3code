import {
  AuthAccessTokenType,
  AuthStandardClientScopes,
  type AuthAccessTokenResult,
  type AuthClientMetadata,
} from "@t3tools/contracts";
import { encodeOAuthScope } from "@t3tools/shared/oauthScope";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/http";

import type { ServerConfig } from "../config.ts";
import * as SessionStore from "./SessionStore.ts";

// Clyde signs the owner in from Tailscale Serve's identity header. Serve strips
// a client-supplied copy of the header and fills it only for user-owned
// devices, and it reaches this server from loopback. The header is trusted only
// on a loopback connection, because the Mac mini runs no agent process that
// could send a forged copy (docs/contributing/decisions/0009).
export const TAILSCALE_USER_LOGIN_HEADER = "tailscale-user-login";
export const TAILSCALE_USER_NAME_HEADER = "tailscale-user-name";
export const TAILSCALE_OWNER_SUBJECT_PREFIX = "tailscale:";

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1"]);

export function isLoopbackAddress(address: string | undefined): boolean {
  if (address === undefined) {
    return false;
  }
  const normalized = address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address;
  return LOOPBACK_ADDRESSES.has(normalized);
}

// An owner login puts the server in owner mode: the owner signs in with
// Tailscale, and T3 Code's pairing grants are off (docs/contributing/security.md
// rule 18).
export function isTailscaleOwnerMode(
  config: Pick<ServerConfig["Service"], "tailscaleOwnerLogin">,
): boolean {
  return (config.tailscaleOwnerLogin?.trim() ?? "") !== "";
}

const PAIRING_OFF_MESSAGE = "Pairing is off: sign in with Tailscale.";

export class PairingOffError extends Schema.TaggedError<PairingOffError>()("PairingOffError", {}) {
  override get message(): string {
    return PAIRING_OFF_MESSAGE;
  }
}
export const isPairingOffError = Schema.is(PairingOffError);

export function resolveTailscaleOwner(input: {
  readonly ownerLogin: string | undefined;
  readonly headerLogin: string | undefined;
  readonly headerName: string | undefined;
  readonly remoteAddress: string | undefined;
}) {
  const owner = input.ownerLogin?.trim().toLowerCase();
  const login = input.headerLogin?.trim().toLowerCase();
  if (!owner || !login || login !== owner || !isLoopbackAddress(input.remoteAddress)) {
    return undefined;
  }
  const name = input.headerName?.trim();
  return {
    login,
    subject: `${TAILSCALE_OWNER_SUBJECT_PREFIX}${login}`,
    label: `Tailscale ${name && name.length > 0 ? name : login}`,
  };
}

function readHeader(request: HttpServerRequest.HttpServerRequest, name: string) {
  const value = request.headers[name];
  return typeof value === "string" ? value : undefined;
}

function readRemoteAddress(request: HttpServerRequest.HttpServerRequest) {
  const source = request.source as {
    readonly remoteAddress?: string | null;
    readonly socket?: { readonly remoteAddress?: string | null };
  } | null;
  return source?.socket?.remoteAddress ?? source?.remoteAddress ?? undefined;
}

export function resolveTailscaleOwnerFromRequest(
  config: Pick<ServerConfig["Service"], "tailscaleOwnerLogin">,
  request: HttpServerRequest.HttpServerRequest,
) {
  return resolveTailscaleOwner({
    ownerLogin: config.tailscaleOwnerLogin,
    headerLogin: readHeader(request, TAILSCALE_USER_LOGIN_HEADER),
    headerName: readHeader(request, TAILSCALE_USER_NAME_HEADER),
    remoteAddress: readRemoteAddress(request),
  });
}

// Matches the pairing exchange in EnvironmentAuth: standard client scopes, the
// session store's default lifetime for a bearer token, and one hour for a
// DPoP-bound token.
const DPOP_ACCESS_TOKEN_TTL = Duration.hours(1);

export const issueTailscaleOwnerAccessToken = Effect.fn("TailscaleIdentityAuth.issueAccessToken")(
  function* (input: {
    readonly owner: NonNullable<ReturnType<typeof resolveTailscaleOwner>>;
    readonly client: AuthClientMetadata;
    readonly proofKeyThumbprint: string | undefined;
  }) {
    const sessions = yield* SessionStore.SessionStore;
    const issued = yield* sessions.issue({
      method: input.proofKeyThumbprint ? "dpop-access-token" : "bearer-access-token",
      subject: input.owner.subject,
      scopes: AuthStandardClientScopes,
      ...(input.proofKeyThumbprint
        ? { proofKeyThumbprint: input.proofKeyThumbprint, ttl: DPOP_ACCESS_TOKEN_TTL }
        : {}),
      client: { ...input.client, label: input.client.label ?? input.owner.label },
    });
    const now = yield* DateTime.now;
    return {
      access_token: issued.token,
      issued_token_type: AuthAccessTokenType,
      token_type: input.proofKeyThumbprint ? "DPoP" : "Bearer",
      expires_in: Math.max(
        0,
        Math.floor((issued.expiresAt.epochMilliseconds - now.epochMilliseconds) / 1000),
      ),
      scope: encodeOAuthScope(issued.scopes),
    } satisfies AuthAccessTokenResult;
  },
);
