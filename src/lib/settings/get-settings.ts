import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_GENRES } from "@/lib/validations/browse-filters";
import { DEFAULT_SUGGESTED_GAMES } from "@/lib/validations/onboarding";

// Admin Settings (024) -- the singleton row's full shape, extended here
// with every section's own fields (research.md #1 there). Falling back
// to DEFAULTS on a validation failure (e.g. a future column rename
// mid-migration) is the same defensive behavior 002 already
// established for maintenanceMode/maintenanceMessage.
const settingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().nullable(),
  siteName: z.string(),
  tagline: z.string().nullable(),
  supportEmail: z.string().nullable(),
  defaultTheme: z.enum(["dark", "light"]),
  phraseFilterEnabled: z.boolean(),
  linkFilterEnabled: z.boolean(),
  boostFilterEnabled: z.boolean(),
  newAccountReviewEnabled: z.boolean(),
  bannedPhrases: z.array(z.string()),
  autoHideEnabled: z.boolean(),
  autoHideThreshold: z.number().int(),
  autoEscalateSeverity: z.enum(["low", "med", "high"]),
  discordFlag: z.boolean(),
  groupsFlag: z.boolean(),
  ratingsFlag: z.boolean(),
  forumFlag: z.boolean(),
  tabletopFlag: z.boolean(),
  openSignups: z.boolean(),
  discoverableByDefault: z.boolean(),
  // Lists (030). A parse failure here degrades to DEFAULTS below --
  // i.e. the list that used to be hardcoded -- never to an empty list,
  // which would leave Post a Game with no genres to offer.
  genres: z.array(z.string()).min(1),
  // Lists (031). Same fallback reasoning as genres: an empty list would
  // leave onboarding's games step with nothing to click (it has no
  // free-text entry), so a parse failure degrades to the defaults rather
  // than to nothing.
  suggestedGames: z.array(z.string()).min(1),
});

export type Settings = z.infer<typeof settingsSchema>;

const DEFAULTS: Settings = {
  maintenanceMode: false,
  maintenanceMessage: null,
  siteName: "playm8z",
  tagline: null,
  supportEmail: null,
  defaultTheme: "dark",
  phraseFilterEnabled: true,
  linkFilterEnabled: true,
  boostFilterEnabled: true,
  newAccountReviewEnabled: true,
  bannedPhrases: ["free nitro", "cheap boosting", "click here", "dm for rates", "gift-nitro"],
  autoHideEnabled: false,
  autoHideThreshold: 3,
  autoEscalateSeverity: "high",
  discordFlag: false,
  groupsFlag: false,
  ratingsFlag: false,
  forumFlag: true,
  tabletopFlag: true,
  openSignups: true,
  discoverableByDefault: true,
  genres: [...DEFAULT_GENRES],
  suggestedGames: [...DEFAULT_SUGGESTED_GAMES],
};

// A few seconds' staleness is acceptable for flags that change rarely
// and deliberately (research.md #2) -- avoids a Postgres round trip on
// every single request through proxy.ts.
const CACHE_TTL_MS = 5000;
let cache: { value: Settings; expiresAt: number } | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const [row] = await db.select().from(settings).limit(1);
  const parsed = row ? settingsSchema.safeParse(row) : null;
  const value = parsed?.success ? parsed.data : DEFAULTS;

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/**
 * Forces the next getSettings() call to re-read the database. Every
 * settings-save Server Action (upsert-settings.ts) calls this after
 * writing, so an admin's own save is visible on the very next request
 * -- `revalidatePath()` alone only invalidates Next.js's route cache,
 * not this hand-rolled TTL cache (a real bug an admin-settings.spec.ts
 * e2e test caught: an immediate reload after Save showed stale data
 * for up to 5s). Also used directly by tests that mutate `settings`
 * outside a Server Action.
 */
export function invalidateSettingsCache(): void {
  cache = null;
}
