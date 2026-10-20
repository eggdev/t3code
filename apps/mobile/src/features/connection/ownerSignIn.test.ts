import { describe, expect, it } from "vite-plus/test";

import { readOwnerSignInAddress } from "./ownerSignIn";
import { buildPairingUrl } from "./pairing";

describe("readOwnerSignInAddress", () => {
  it("signs in by address when the URL has no pairing code", () => {
    expect(readOwnerSignInAddress("https://dev-hub.taild8ff28.ts.net:8443")).toBe(
      "https://dev-hub.taild8ff28.ts.net:8443",
    );
    expect(readOwnerSignInAddress("  https://dev-hub.taild8ff28.ts.net:8443/pair  ")).toBe(
      "https://dev-hub.taild8ff28.ts.net:8443",
    );
  });

  it("keeps a bare address typed with no scheme", () => {
    expect(readOwnerSignInAddress("dev-hub.taild8ff28.ts.net:8443")).toBe(
      "dev-hub.taild8ff28.ts.net:8443",
    );
    expect(readOwnerSignInAddress(buildPairingUrl("dev-hub.taild8ff28.ts.net", ""))).toBe(
      "dev-hub.taild8ff28.ts.net",
    );
  });

  it("leaves pairing links to the pairing flow", () => {
    expect(
      readOwnerSignInAddress("https://remote.example.com/pair#token=pairing-token"),
    ).toBeNull();
    expect(readOwnerSignInAddress(buildPairingUrl("192.168.1.100:3773", "CODE"))).toBeNull();
    expect(
      readOwnerSignInAddress(
        "https://app.t3.codes/pair?host=https%3A%2F%2Fdesktop.tailnet.ts.net%2F#token=pairing-token",
      ),
    ).toBeNull();
    expect(readOwnerSignInAddress("   ")).toBeNull();
  });
});
