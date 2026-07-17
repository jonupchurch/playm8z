import { z } from "zod";

export const settingsSectionSchema = z.enum(["general", "mod", "roles", "features", "safety", "lists"]);
export type SettingsSection = z.infer<typeof settingsSectionSchema>;

// The section-nav's own URL param (`?section=`) -- an invalid/missing
// value just means General shows, never a 400/error state (same
// convention as every other admin drawer/editor param).
export const settingsSectionParamSchema = settingsSectionSchema.catch("general");

export const saveGeneralSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120).optional(),
  supportEmail: z.string().trim().email().optional().or(z.literal("")),
  defaultTheme: z.enum(["dark", "light"]),
});
export type SaveGeneralSettingsInput = z.infer<typeof saveGeneralSettingsSchema>;

export const toggleMaintenanceModeSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().trim().max(300).optional(),
});
export type ToggleMaintenanceModeInput = z.infer<typeof toggleMaintenanceModeSchema>;

export const autoEscalateSeveritySchema = z.enum(["low", "med", "high"]);
export type AutoEscalateSeverity = z.infer<typeof autoEscalateSeveritySchema>;

export const saveModerationSettingsSchema = z.object({
  phraseFilterEnabled: z.boolean(),
  linkFilterEnabled: z.boolean(),
  boostFilterEnabled: z.boolean(),
  newAccountReviewEnabled: z.boolean(),
  bannedPhrases: z.array(z.string().trim().min(1).max(60)).max(200),
  autoHideEnabled: z.boolean(),
  autoHideThreshold: z.number().int().min(1).max(20),
  autoEscalateSeverity: autoEscalateSeveritySchema,
});
export type SaveModerationSettingsInput = z.infer<typeof saveModerationSettingsSchema>;

// Lists (030) -- the genres offered on Post a Game and Browse.
//
// `.trim()` runs before `.min(1)`, so a whitespace-only entry is
// rejected rather than stored as "" (FR-011). Casing is preserved
// exactly as typed (FR-014: "Co-op PvE" and "TTRPG" are real entries) --
// only the duplicate COMPARISON lowercases, never the stored value.
const uniqueIgnoringCase = (list: string[]) =>
  new Set(list.map((item) => item.trim().toLowerCase())).size === list.length;

export const saveListsSettingsSchema = z.object({
  genres: z
    .array(z.string().trim().min(1).max(50))
    // FR-010: an empty list would leave Post a Game with nothing to
    // offer, so it's refused rather than stored.
    .min(1, "Keep at least one genre — Post a game needs something to offer.")
    .max(50)
    .refine(uniqueIgnoringCase, { message: "That genre is already in the list." }),
});
export type SaveListsSettingsInput = z.infer<typeof saveListsSettingsSchema>;

// Roles & access -- both below `moderator` for every existing
// require-role.ts('moderator') gate (research.md #5).
export const assignableRoleSchema = z.enum(["viewer", "support", "moderator", "admin"]);
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

export const assignTeamRoleSchema = z.object({
  email: z.string().trim().email(),
  role: assignableRoleSchema,
});
export type AssignTeamRoleInput = z.infer<typeof assignTeamRoleSchema>;

export const removeTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});
export type RemoveTeamMemberInput = z.infer<typeof removeTeamMemberSchema>;

export const saveFeatureFlagsSchema = z.object({
  discordFlag: z.boolean(),
  groupsFlag: z.boolean(),
  ratingsFlag: z.boolean(),
  forumFlag: z.boolean(),
  tabletopFlag: z.boolean(),
  openSignups: z.boolean(),
});
export type SaveFeatureFlagsInput = z.infer<typeof saveFeatureFlagsSchema>;

export const saveSafetySettingsSchema = z.object({
  discoverableByDefault: z.boolean(),
});
export type SaveSafetySettingsInput = z.infer<typeof saveSafetySettingsSchema>;
