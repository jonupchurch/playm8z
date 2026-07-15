import { describe, expect, it } from "vitest";
import { computeAutoFlagReason } from "./auto-flag-rules";

describe("computeAutoFlagReason", () => {
  it("flags a scam/phishing pattern", () => {
    expect(computeAutoFlagReason("Get free skins and V-bucks now!", 100, false)).toBe("phishing_or_scam");
    expect(computeAutoFlagReason("Visit http://freevp-skins.biz and claim now", 100, false)).toBe("phishing_or_scam");
  });

  it("flags boosting-service keywords", () => {
    expect(computeAutoFlagReason("Cheap rank boosting, all regions, DM me", 100, false)).toBe("boosting_service");
    expect(computeAutoFlagReason("Professional elo boost service", 100, false)).toBe("boosting_service");
  });

  it("flags a new account's first posting when nothing else matches", () => {
    expect(computeAutoFlagReason("LF chill duo, just for fun", 1, true)).toBe("new_account_first_post");
  });

  it("does not flag a new account's second posting", () => {
    expect(computeAutoFlagReason("LF chill duo, just for fun", 1, false)).toBeNull();
  });

  it("does not flag an established account's first posting", () => {
    expect(computeAutoFlagReason("LF chill duo, just for fun", 30, true)).toBeNull();
  });

  it("returns null for an unremarkable posting", () => {
    expect(computeAutoFlagReason("Ranked grind, need one more for 5-stack", 200, false)).toBeNull();
  });

  it("prioritizes scam patterns over boosting keywords when both match", () => {
    expect(computeAutoFlagReason("free robux and cheap rank boosting", 100, false)).toBe("phishing_or_scam");
  });
});
