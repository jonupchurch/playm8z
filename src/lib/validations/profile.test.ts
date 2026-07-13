import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  privacyKeySchema,
  updateEmailSchema,
  updateProfileSchema,
  userGameSchema,
} from "./profile";

describe("updateProfileSchema", () => {
  it("accepts valid name, region, and bio", () => {
    const result = updateProfileSchema.parse({
      name: "Vex_00",
      region: "eu-west",
      bio: "Controller main chasing Radiant.",
    });
    expect(result.name).toBe("Vex_00");
    expect(result.bio).toBe("Controller main chasing Radiant.");
  });

  it("accepts an absent bio", () => {
    const result = updateProfileSchema.parse({ name: "Vex_00", region: "eu-west" });
    expect(result.bio).toBeUndefined();
  });

  it("rejects an empty name", () => {
    expect(() => updateProfileSchema.parse({ name: "  ", region: "eu-west" })).toThrow();
  });

  it("rejects a name over 50 characters", () => {
    expect(() =>
      updateProfileSchema.parse({ name: "a".repeat(51), region: "eu-west" }),
    ).toThrow();
  });

  it("rejects an invalid region", () => {
    expect(() => updateProfileSchema.parse({ name: "Vex_00", region: "mars" })).toThrow();
  });

  it("rejects a bio over 300 characters", () => {
    expect(() =>
      updateProfileSchema.parse({ name: "Vex_00", region: "eu-west", bio: "a".repeat(301) }),
    ).toThrow();
  });
});

describe("userGameSchema", () => {
  it("accepts a game with rank and hours", () => {
    const result = userGameSchema.parse({ game: "Valorant", rank: "Diamond 1", hoursPlayed: 340 });
    expect(result).toEqual({ game: "Valorant", rank: "Diamond 1", hoursPlayed: 340 });
  });

  it("accepts a game with no rank or hours", () => {
    const result = userGameSchema.parse({ game: "Valorant" });
    expect(result.rank).toBeUndefined();
    expect(result.hoursPlayed).toBeUndefined();
  });

  it("rejects an empty game name", () => {
    expect(() => userGameSchema.parse({ game: "" })).toThrow();
  });

  it("rejects negative hours played", () => {
    expect(() => userGameSchema.parse({ game: "Valorant", hoursPlayed: -1 })).toThrow();
  });

  it("rejects hours played over the sanity cap", () => {
    expect(() => userGameSchema.parse({ game: "Valorant", hoursPlayed: 100001 })).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("accepts a valid current + new password pair", () => {
    const result = changePasswordSchema.parse({
      currentPassword: "oldpassword",
      newPassword: "newpassword123",
    });
    expect(result.newPassword).toBe("newpassword123");
  });

  it("rejects a new password under 8 characters", () => {
    expect(() =>
      changePasswordSchema.parse({ currentPassword: "oldpassword", newPassword: "short" }),
    ).toThrow();
  });

  it("rejects an empty current password", () => {
    expect(() =>
      changePasswordSchema.parse({ currentPassword: "", newPassword: "newpassword123" }),
    ).toThrow();
  });
});

describe("updateEmailSchema", () => {
  it("accepts a valid email", () => {
    const result = updateEmailSchema.parse({ email: "new@example.com" });
    expect(result.email).toBe("new@example.com");
  });

  it("rejects a malformed email", () => {
    expect(() => updateEmailSchema.parse({ email: "not-an-email" })).toThrow();
  });
});

describe("privacyKeySchema", () => {
  it("accepts each of the four known privacy keys", () => {
    for (const key of [
      "privacyShowAge",
      "privacyShowRegion",
      "privacyShowOnline",
      "privacyDiscoverable",
    ]) {
      expect(privacyKeySchema.parse(key)).toBe(key);
    }
  });

  it("rejects an unknown key", () => {
    expect(() => privacyKeySchema.parse("privacyShowEmail")).toThrow();
  });
});
