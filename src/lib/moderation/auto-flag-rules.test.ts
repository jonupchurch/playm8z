import { describe, expect, it } from "vitest";
import { computeAutoFlagReason, type AutoFlagConfig } from "./auto-flag-rules";

const ALL_ENABLED: AutoFlagConfig = {
  bannedPhrases: [],
  phraseFilterEnabled: true,
  linkFilterEnabled: true,
  boostFilterEnabled: true,
  newAccountReviewEnabled: true,
};

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

// Admin Settings (024)/research.md #3: settings-driven behavior --
// bannedPhrases is an admin-editable list, and each of the four checks
// is independently toggleable.
describe("computeAutoFlagReason (settings-driven, 024)", () => {
  it("flags text matching an admin-added banned phrase", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, bannedPhrases: ["dm for rates"] };
    expect(computeAutoFlagReason("LF duo, DM for rates on boosts", 100, false, config)).toBe("phishing_or_scam");
  });

  it("does not flag a banned phrase when the phrase filter is disabled", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, phraseFilterEnabled: false, bannedPhrases: ["dm for rates"] };
    expect(computeAutoFlagReason("DM for rates", 100, false, config)).toBeNull();
  });

  it("does not flag a built-in scam phrase when the phrase filter is disabled", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, phraseFilterEnabled: false };
    expect(computeAutoFlagReason("Get free skins and V-bucks now!", 100, false, config)).toBeNull();
  });

  it("does not flag an external link when the link filter is disabled", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, linkFilterEnabled: false };
    expect(computeAutoFlagReason("Visit http://example.com for details", 100, false, config)).toBeNull();
  });

  it("does not flag boosting keywords when the boost filter is disabled", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, boostFilterEnabled: false };
    expect(computeAutoFlagReason("Cheap rank boosting, all regions", 100, false, config)).toBeNull();
  });

  it("does not flag a new account's first posting when new-account review is disabled", () => {
    const config: AutoFlagConfig = { ...ALL_ENABLED, newAccountReviewEnabled: false };
    expect(computeAutoFlagReason("LF chill duo, just for fun", 1, true, config)).toBeNull();
  });

  it("defaults to every check enabled with no extra banned phrases when config is omitted", () => {
    expect(computeAutoFlagReason("Get free skins and V-bucks now!", 100, false)).toBe("phishing_or_scam");
  });
});
