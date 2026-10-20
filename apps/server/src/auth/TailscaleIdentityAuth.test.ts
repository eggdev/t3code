import { describe, expect, it } from "vite-plus/test";

import { isLoopbackAddress, resolveTailscaleOwner } from "./TailscaleIdentityAuth.ts";

const owner = {
  ownerLogin: "owner@example.com",
  headerLogin: "owner@example.com",
  headerName: "Owner Name",
  remoteAddress: "127.0.0.1",
};

describe("resolveTailscaleOwner", () => {
  it("signs in the owner from a loopback request that carries the owner's login", () => {
    expect(resolveTailscaleOwner(owner)).toEqual({
      login: "owner@example.com",
      subject: "tailscale:owner@example.com",
      label: "Tailscale Owner Name",
    });
  });

  it("matches the login without regard to case or surrounding space", () => {
    expect(resolveTailscaleOwner({ ...owner, headerLogin: "  Owner@Example.com " })?.login).toBe(
      "owner@example.com",
    );
  });

  it("refuses another tailnet user", () => {
    expect(resolveTailscaleOwner({ ...owner, headerLogin: "other@example.com" })).toBeUndefined();
  });

  it("refuses a request with no identity header, as Serve sends for tagged devices and Funnel", () => {
    expect(resolveTailscaleOwner({ ...owner, headerLogin: undefined })).toBeUndefined();
  });

  it("refuses the header from a connection that does not come from loopback", () => {
    expect(resolveTailscaleOwner({ ...owner, remoteAddress: "100.64.0.7" })).toBeUndefined();
    expect(resolveTailscaleOwner({ ...owner, remoteAddress: undefined })).toBeUndefined();
  });

  it("stays off when no owner login is configured", () => {
    expect(resolveTailscaleOwner({ ...owner, ownerLogin: undefined })).toBeUndefined();
    expect(resolveTailscaleOwner({ ...owner, ownerLogin: " " })).toBeUndefined();
  });

  it("labels the session with the login when Serve sends no name", () => {
    expect(resolveTailscaleOwner({ ...owner, headerName: undefined })?.label).toBe(
      "Tailscale owner@example.com",
    );
  });
});

describe("isLoopbackAddress", () => {
  it("accepts IPv4, IPv6 and IPv4-mapped loopback", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("refuses other addresses", () => {
    expect(isLoopbackAddress("10.0.0.2")).toBe(false);
    expect(isLoopbackAddress("::ffff:192.168.1.4")).toBe(false);
  });
});
