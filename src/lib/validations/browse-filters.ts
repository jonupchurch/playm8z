import { z } from "zod";

// Admin-editable since 030: the live list is `settings.genres`, read at
// request time. This array is ONLY the column default/seed -- nothing
// reads it to decide what to offer or accept. Keeping a second runtime
// source would recreate exactly the drift 030 exists to prevent (one
// screen on the const, one on the row), so if you are reaching for this
// at request time, read settings instead (research.md #2).
export const DEFAULT_GENRES = [
  "FPS",
  "RPG",
  "Co-op PvE",
  "Party",
  "MOBA",
  "Sandbox",
  "TTRPG",
  "Tabletop",
] as const;

export const REGIONS = ["na-east", "na-west", "eu-west", "eu-east", "asia", "oceania"] as const;

export const TIME_SLOTS = ["morning", "afternoon", "evening", "late", "weekend"] as const;

export const PLATFORMS = ["any", "pc", "console", "cross", "table"] as const;

// searchParams gives a single value as a plain string, more than one
// as an array, and an absent key as undefined -- normalize to an array
// either way before the enum-array check runs.
function toArray(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// A visitor-controlled URL query string feeds this straight into a
// database WHERE clause (search-postings.ts) -- every facet value is
// validated here before it can reach the query builder (Principle II).
export const browseFiltersSchema = z.object({
  q: z.string().max(200).optional().default(""),
  vibe: z.enum(["any", "fun", "serious"]).catch("any"),
  games: z.preprocess(toArray, z.array(z.string().max(100)).max(20)).catch([]),
  // Shape only -- membership can't be a static enum now the list is
  // admin-editable (030, research.md #3). The Browse page intersects
  // these against the stored list before querying, so a retired genre
  // in an old bookmark is dropped rather than passed to the WHERE
  // clause (where it would match nothing and show an empty Browse,
  // reading as "nothing here" instead of "filter ignored").
  genres: z.preprocess(toArray, z.array(z.string().max(50)).max(8)).catch([]),
  regions: z.preprocess(toArray, z.array(z.enum(REGIONS)).max(6)).catch([]),
  timeSlots: z.preprocess(toArray, z.array(z.enum(TIME_SLOTS)).max(5)).catch([]),
  ageGroup: z.enum(["any", "18", "21"]).catch("any"),
  openSlots: z.enum(["any", "1", "2", "3"]).catch("any"),
  platform: z.enum(PLATFORMS).catch("any"),
  micRequired: z.preprocess((value) => value === "true", z.boolean()).catch(false),
  sort: z.enum(["recent", "seats", "soon"]).catch("recent"),
});

export type BrowseFilters = z.infer<typeof browseFiltersSchema>;
