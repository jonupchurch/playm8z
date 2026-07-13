import { describe, expect, it } from "vitest";
import {
  ageGroupSchema,
  avatarColorSchema,
  gamesPlayedSchema,
  nameSchema,
  onboardingPatchSchema,
  platformsSchema,
  playTimeSlotsSchema,
  regionSchema,
  vibeSchema,
} from "./onboarding";

describe("nameSchema", () => {
  it("accepts a non-empty display name", () => {
    expect(nameSchema.safeParse("Mara").success).toBe(true);
  });

  it("rejects an empty display name", () => {
    expect(nameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a whitespace-only display name", () => {
    expect(nameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a display name over 50 characters", () => {
    expect(nameSchema.safeParse("a".repeat(51)).success).toBe(false);
  });
});

describe("avatarColorSchema", () => {
  it("accepts one of the 5 fixed swatch identifiers", () => {
    expect(avatarColorSchema.safeParse("amber-orange").success).toBe(true);
  });

  it("rejects an arbitrary string", () => {
    expect(avatarColorSchema.safeParse("not-a-swatch").success).toBe(false);
  });
});

describe("regionSchema", () => {
  it("accepts a listed region", () => {
    expect(regionSchema.safeParse("na-west").success).toBe(true);
  });

  it("rejects an unlisted region", () => {
    expect(regionSchema.safeParse("antarctica").success).toBe(false);
  });
});

describe("platformsSchema", () => {
  it("accepts an empty array (optional per FR-010)", () => {
    expect(platformsSchema.safeParse([]).success).toBe(true);
  });

  it("accepts a valid subset of platforms", () => {
    expect(platformsSchema.safeParse(["pc", "console"]).success).toBe(true);
  });

  it("rejects an unlisted platform", () => {
    expect(platformsSchema.safeParse(["vr"]).success).toBe(false);
  });
});

describe("ageGroupSchema", () => {
  it("accepts 18", () => {
    expect(ageGroupSchema.safeParse("18").success).toBe(true);
  });

  it("accepts 21", () => {
    expect(ageGroupSchema.safeParse("21").success).toBe(true);
  });

  it("rejects 13 -- ADR 0002 drops the 13+ tier even though the wireframe still shows it", () => {
    expect(ageGroupSchema.safeParse("13").success).toBe(false);
  });
});

describe("vibeSchema", () => {
  it("accepts fun/serious/both", () => {
    expect(vibeSchema.safeParse("fun").success).toBe(true);
    expect(vibeSchema.safeParse("serious").success).toBe(true);
    expect(vibeSchema.safeParse("both").success).toBe(true);
  });

  it("rejects an unlisted vibe", () => {
    expect(vibeSchema.safeParse("chaotic").success).toBe(false);
  });
});

describe("playTimeSlotsSchema", () => {
  it("accepts an empty array (optional per FR-011)", () => {
    expect(playTimeSlotsSchema.safeParse([]).success).toBe(true);
  });

  it("rejects an unlisted slot", () => {
    expect(playTimeSlotsSchema.safeParse(["noon"]).success).toBe(false);
  });
});

describe("gamesPlayedSchema", () => {
  it("accepts a non-empty array of game names", () => {
    expect(gamesPlayedSchema.safeParse(["Valorant", "Catan"]).success).toBe(true);
  });

  it("rejects an array containing an empty string", () => {
    expect(gamesPlayedSchema.safeParse([""]).success).toBe(false);
  });
});

describe("onboardingPatchSchema", () => {
  it("accepts a partial patch with only one field (a single step's data)", () => {
    const result = onboardingPatchSchema.safeParse({ name: "Mara" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty patch (a skip with nothing entered yet)", () => {
    expect(onboardingPatchSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an ageGroup of 13 even inside a full patch", () => {
    const result = onboardingPatchSchema.safeParse({
      name: "Mara",
      region: "na-west",
      ageGroup: "13",
    });
    expect(result.success).toBe(false);
  });
});
