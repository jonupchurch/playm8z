import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry (the real client, not the proxies)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("returns null with no forwarding headers, so local dev / e2e / CI aren't limited", () => {
    expect(clientIp(new Headers())).toBeNull();
  });

  it("returns null for loopback addresses", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "127.0.0.1" }))).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": "::1" }))).toBeNull();
    expect(clientIp(new Headers({ "x-real-ip": "::ffff:127.0.0.1" }))).toBeNull();
  });
});
