import { describe, expect, it } from "vite-plus/test";

import { isPublicIPv4, publicAddress } from "./publicAddress.ts";

describe("isPublicIPv4", () => {
  it("accepts public addresses", () => {
    expect(isPublicIPv4("104.16.0.1")).toBe(true);
    expect(isPublicIPv4("8.8.8.8")).toBe(true);
  });

  it("refuses private, loopback, tailnet, metadata, benchmark and multicast ranges", () => {
    for (const address of [
      "10.1.2.3",
      "127.0.0.1",
      "172.17.0.1",
      "192.168.4.37",
      "100.64.132.97",
      "100.88.14.22",
      "169.254.169.254",
      "198.18.0.1",
      "224.0.0.1",
      "0.0.0.0",
    ]) {
      expect(isPublicIPv4(address)).toBe(false);
    }
  });

  it("refuses IPv6", () => {
    expect(isPublicIPv4("2606:4700::1111")).toBe(false);
  });
});

describe("publicAddress", () => {
  it("pins the first address when every address is public", async () => {
    await expect(
      publicAddress("example.com", async () => ["93.184.216.34", "8.8.8.8"]),
    ).resolves.toBe("93.184.216.34");
  });

  it("refuses a name that mixes in a private address", async () => {
    await expect(publicAddress("evil.test", async () => ["8.8.8.8", "10.0.0.1"])).rejects.toThrow(
      "Private destination",
    );
  });

  it("refuses a name that resolves to nothing", async () => {
    await expect(publicAddress("none.test", async () => [])).rejects.toThrow("Private destination");
  });
});
