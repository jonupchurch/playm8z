import { z } from "zod";

// Single source of truth for the 5 fixed avatar swatches -- the id is
// what's persisted (data-model.md), the gradient is what's rendered.
export const AVATAR_COLORS = [
  { id: "amber-orange", gradient: "linear-gradient(135deg,#ffb000,#ff6b1a)" },
  { id: "orange-magenta", gradient: "linear-gradient(135deg,#ff6b1a,#ff3b6b)" },
  { id: "magenta-amber", gradient: "linear-gradient(135deg,#ff3b6b,#ffb000)" },
  { id: "cyan-orange", gradient: "linear-gradient(135deg,#35d0e0,#ff6b1a)" },
  { id: "green-amber", gradient: "linear-gradient(135deg,#4ec96a,#ffb000)" },
] as const;

export const REGIONS = [
  { id: "na-east", label: "NA-East" },
  { id: "na-west", label: "NA-West" },
  { id: "eu-west", label: "EU-West" },
  { id: "eu-east", label: "EU-East" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
] as const;

export const PLATFORMS = [
  { id: "pc", label: "PC" },
  { id: "console", label: "Console" },
  { id: "mobile", label: "Mobile" },
  { id: "table", label: "Tabletop" },
] as const;

// 18+/21+ only (ADR 0002) -- no 13+ tier, even though the source
// wireframe still shows one. 21+ is an optional stricter self-tag, not
// a separate platform minimum.
export const AGE_GROUPS = [
  { id: "18", label: "18+" },
  { id: "21", label: "21+" },
] as const;

// Admin-editable since 031: the live list is `settings.suggestedGames`,
// read at request time and passed into the wizard as a prop. This array
// is ONLY the column default/seed -- nothing reads it to decide what to
// offer, or the wizard and the stored list could disagree.
//
// It is a SUGGESTION list, not a catalog: `gamesPlayedSchema` below
// deliberately does NOT validate against it (ADR 0001 -- games are
// free-text keywords). Tightening that would look like better
// validation and would in fact build the catalog that ADR rejects.
export const DEFAULT_SUGGESTED_GAMES = [
  "Valorant",
  "Helldivers 2",
  "Baldur's Gate 3",
  "CS2",
  "Deep Rock Galactic",
  "Lethal Company",
  "Sea of Thieves",
  "League of Legends",
  "Overwatch 2",
  "Minecraft",
  "Elden Ring",
  "D&D 5e",
  "Catan",
  "Magic: The Gathering",
] as const;

export const VIBES = [
  { id: "fun", label: "Casual" },
  { id: "serious", label: "Serious" },
  { id: "both", label: "A bit of both" },
] as const;

export const PLAY_TIME_SLOTS = [
  { id: "morning", label: "Mornings" },
  { id: "afternoon", label: "Afternoons" },
  { id: "evening", label: "Evenings" },
  { id: "late", label: "Late night" },
  { id: "weekend", label: "Weekends" },
] as const;

const idsOf = <T extends { id: string }>(list: readonly T[]) =>
  list.map((item) => item.id) as [string, ...string[]];

export const nameSchema = z.string().trim().min(1).max(50);
export const avatarColorSchema = z.enum(idsOf(AVATAR_COLORS));
export const regionSchema = z.enum(idsOf(REGIONS));
export const platformsSchema = z.array(z.enum(idsOf(PLATFORMS)));
export const ageGroupSchema = z.enum(idsOf(AGE_GROUPS));
export const vibeSchema = z.enum(idsOf(VIBES));
export const playTimeSlotsSchema = z.array(z.enum(idsOf(PLAY_TIME_SLOTS)));
export const gamesPlayedSchema = z.array(z.string().trim().min(1));

// Partial patch: POST /api/onboarding is called once per step (and once
// more on skip), so every field is optional at the API boundary -- only
// the fields the current step actually collected are ever sent. Handle
// is included since a Google account without one yet supplies it here
// (research.md #2), sharing handleSchema's own format rule.
export const onboardingPatchSchema = z.object({
  handle: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,23}$/).optional(),
  name: nameSchema.optional(),
  avatarColor: avatarColorSchema.optional(),
  gamesPlayed: gamesPlayedSchema.optional(),
  region: regionSchema.optional(),
  platforms: platformsSchema.optional(),
  ageGroup: ageGroupSchema.optional(),
  vibe: vibeSchema.optional(),
  playTimeSlots: playTimeSlotsSchema.optional(),
});

export type OnboardingPatchInput = z.infer<typeof onboardingPatchSchema>;
