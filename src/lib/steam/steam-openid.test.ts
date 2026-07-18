import { describe, expect, it, vi } from "vitest";
import { buildAuthUrl, verifyAssertion } from "./steam-openid";

const VALID = {
  "openid.mode": "id_res",
  "openid.claimed_id": "https://steamcommunity.com/openid/id/76561197960287930",
  "openid.signed": "signed,fields",
  "openid.sig": "abc",
};

function fetchReturning(body: string, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, text: async () => body })) as unknown as typeof fetch;
}

describe("buildAuthUrl", () => {
  it("builds a checkid_setup URL carrying return_to, realm, and identifier_select", () => {
    const url = buildAuthUrl("https://app.test/api/steam/callback", "https://app.test");
    expect(url).toContain("openid.mode=checkid_setup");
    expect(url).toContain(encodeURIComponent("https://app.test/api/steam/callback"));
    expect(url).toContain("identifier_select");
  });
});

describe("verifyAssertion (the trust boundary)", () => {
  it("returns the SteamID64 only when Steam confirms is_valid:true", async () => {
    expect(await verifyAssertion(VALID, fetchReturning("ns:...\nis_valid:true\n"))).toBe("76561197960287930");
  });

  it("returns null when Steam says is_valid:false (a forged/expired assertion)", async () => {
    expect(await verifyAssertion(VALID, fetchReturning("ns:...\nis_valid:false\n"))).toBeNull();
  });

  it("rejects a tampered claimed_id WITHOUT even calling Steam", async () => {
    const spy = vi.fn();
    const id = await verifyAssertion({ ...VALID, "openid.claimed_id": "https://evil.example/id/1" }, spy as unknown as typeof fetch);
    expect(id).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns null when the verification request itself fails", async () => {
    expect(await verifyAssertion(VALID, fetchReturning("", false))).toBeNull();
    const thrower = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await verifyAssertion(VALID, thrower)).toBeNull();
  });
});
