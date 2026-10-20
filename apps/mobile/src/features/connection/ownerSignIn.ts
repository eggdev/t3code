import { parsePairingUrl } from "./pairing";

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/**
 * Clyde: an address with no pairing code signs in as the owner over Tailscale.
 * Returns that address, or null when the input carries a pairing code.
 */
export function readOwnerSignInAddress(pairingUrl: string): string | null {
  const trimmed = pairingUrl.trim();
  if (trimmed === "") return null;
  // A bare `host:port` parses as a URL whose scheme is the host, so only a
  // value with `://` goes through the pairing link parser.
  if (!HAS_SCHEME.test(trimmed)) {
    return /[#?&]token=/.test(trimmed) ? null : trimmed;
  }
  const { host, code } = parsePairingUrl(trimmed);
  return code === "" && host !== "" ? host : null;
}
