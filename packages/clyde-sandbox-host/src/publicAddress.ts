// @effect-diagnostics nodeBuiltinImport:off -- a plain Node service in a container, outside the Effect runtime.
import * as NodeDnsPromises from "node:dns/promises";
import * as NodeNet from "node:net";

/**
 * True for a public IPv4 address. Private, loopback, link-local (cloud
 * metadata), carrier-grade NAT (the tailnet), benchmark and multicast ranges
 * are not public. IPv6 is never public here: the sandbox network is IPv4 only.
 */
export function isPublicIPv4(address: string): boolean {
  if (NodeNet.isIP(address) !== 4) return false;
  const [a = 0, b = 0] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export type Resolve = (host: string) => Promise<ReadonlyArray<string>>;

export const resolveIPv4: Resolve = async (host) =>
  (await NodeDnsPromises.lookup(host, { family: 4, all: true })).map((entry) => entry.address);

/**
 * The address to connect to, pinned once per connection. Every address the
 * name resolves to must be public, so a name that mixes in a private address
 * is refused.
 */
export async function publicAddress(host: string, resolve: Resolve = resolveIPv4) {
  const addresses = await resolve(host);
  const first = addresses[0];
  if (first === undefined || !addresses.every(isPublicIPv4)) {
    throw new Error("Private destination");
  }
  return first;
}
