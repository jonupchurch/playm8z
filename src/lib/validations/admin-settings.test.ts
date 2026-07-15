import { describe, expect, it } from "vitest";
import {
  saveGeneralSettingsSchema,
  toggleMaintenanceModeSchema,
  saveModerationSettingsSchema,
  assignTeamRoleSchema,
  removeTeamMemberSchema,
  saveFeatureFlagsSchema,
  saveSafetySettingsSchema,
} from "./admin-settings";

describe("saveGeneralSettingsSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      saveGeneralSettingsSchema.safeParse({ siteName: "playm8z", tagline: "Assemble", supportEmail: "a@b.com", defaultTheme: "dark" })
        .success,
    ).toBe(true);
  });

  it("accepts an empty support email", () => {
    expect(saveGeneralSettingsSchema.safeParse({ siteName: "playm8z", defaultTheme: "dark", supportEmail: "" }).success).toBe(true);
  });

  it("rejects a blank site name", () => {
    expect(saveGeneralSettingsSchema.safeParse({ siteName: "", defaultTheme: "dark" }).success).toBe(false);
  });

  it("rejects an invalid theme", () => {
    expect(saveGeneralSettingsSchema.safeParse({ siteName: "playm8z", defaultTheme: "neon" }).success).toBe(false);
  });
});

describe("toggleMaintenanceModeSchema", () => {
  it("accepts a valid payload with an optional message", () => {
    expect(toggleMaintenanceModeSchema.safeParse({ maintenanceMode: true, maintenanceMessage: "back soon" }).success).toBe(true);
    expect(toggleMaintenanceModeSchema.safeParse({ maintenanceMode: false }).success).toBe(true);
  });
});

describe("saveModerationSettingsSchema", () => {
  const valid = {
    phraseFilterEnabled: true,
    linkFilterEnabled: true,
    boostFilterEnabled: true,
    newAccountReviewEnabled: true,
    bannedPhrases: ["free nitro"],
    autoHideEnabled: true,
    autoHideThreshold: 3,
    autoEscalateSeverity: "high" as const,
  };

  it("accepts a valid payload", () => {
    expect(saveModerationSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a threshold below 1 or above 20", () => {
    expect(saveModerationSettingsSchema.safeParse({ ...valid, autoHideThreshold: 0 }).success).toBe(false);
    expect(saveModerationSettingsSchema.safeParse({ ...valid, autoHideThreshold: 21 }).success).toBe(false);
  });

  it("rejects an invalid severity", () => {
    expect(saveModerationSettingsSchema.safeParse({ ...valid, autoEscalateSeverity: "extreme" }).success).toBe(false);
  });
});

describe("assignTeamRoleSchema", () => {
  it("accepts a valid email and role", () => {
    expect(assignTeamRoleSchema.safeParse({ email: "a@b.com", role: "moderator" }).success).toBe(true);
  });

  it("rejects an invalid email or role", () => {
    expect(assignTeamRoleSchema.safeParse({ email: "not-an-email", role: "moderator" }).success).toBe(false);
    expect(assignTeamRoleSchema.safeParse({ email: "a@b.com", role: "owner" }).success).toBe(false);
  });
});

describe("removeTeamMemberSchema", () => {
  it("requires a valid uuid", () => {
    expect(removeTeamMemberSchema.safeParse({ userId: "not-a-uuid" }).success).toBe(false);
    expect(removeTeamMemberSchema.safeParse({ userId: crypto.randomUUID() }).success).toBe(true);
  });
});

describe("saveFeatureFlagsSchema", () => {
  it("accepts a full valid payload", () => {
    expect(
      saveFeatureFlagsSchema.safeParse({
        discordFlag: false,
        groupsFlag: false,
        ratingsFlag: false,
        forumFlag: true,
        tabletopFlag: true,
        openSignups: true,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(saveFeatureFlagsSchema.safeParse({ discordFlag: false }).success).toBe(false);
  });
});

describe("saveSafetySettingsSchema", () => {
  it("accepts a valid payload", () => {
    expect(saveSafetySettingsSchema.safeParse({ discoverableByDefault: true }).success).toBe(true);
  });

  it("rejects a non-boolean", () => {
    expect(saveSafetySettingsSchema.safeParse({ discoverableByDefault: "yes" }).success).toBe(false);
  });
});
