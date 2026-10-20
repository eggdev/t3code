import type { HttpServerRequest } from "effect/http";

import type { ServerConfig } from "../config.ts";

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
