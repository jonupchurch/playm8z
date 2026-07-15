import { and, arrayOverlaps, asc, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getAutoHideCondition } from "@/lib/moderation/auto-hide";
import type { BrowseFilters } from "@/lib/validations/browse-filters";

export type BrowseResult = {
  id: string;
  hostHandle: string;
  hostAvatarColor: string | null;
  game: string;
  genre: string | null;
  title: string;
  blurb: string;
  vibe: string;
  region: string;
  timeSlots: string[];
  seatsTotal: number;
  seatsOpen: number;
  createdAt: Date;
};

const OPEN_SLOTS_MIN: Record<string, number> = { any: 0, "1": 1, "2": 2, "3": 3 };

/**
 * All active-facet conditions (FR-012: AND across facets, OR within a
 * multi-select facet), minus `status = 'open'` itself. Shared by the
 * main search query and get-facet-counts.ts, which needs the same
 * conditions with one facet's own dimension excluded (a Game/Region
 * option's count reflects every OTHER active facet, per the spec's
 * edge case, so an option can validly show 0 without disappearing).
 */
export async function buildFilterConditions(
  filters: BrowseFilters,
  options: { excludeGames?: boolean; excludeRegions?: boolean } = {},
): Promise<SQL[]> {
  // Excludes a deactivated host's postings (Profile + Account settings
  // 007's FR-013/SC-005) and a moderator-removed posting (Admin Users
  // 016's FR-009) -- both callers of this helper (searchPostings and
  // get-facet-counts.ts) already join `users`, so this applies
  // consistently to results and facet counts alike.
  const conditions: SQL[] = [eq(postings.status, "open"), isNull(users.deactivatedAt), isNull(postings.removedAt)];
  const autoHideCondition = await getAutoHideCondition("posting", postings.id);
  if (autoHideCondition) conditions.push(autoHideCondition);

  const q = filters.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const keywordMatch = or(
      ilike(postings.game, pattern),
      ilike(postings.title, pattern),
      ilike(postings.blurb, pattern),
      ilike(postings.genre, pattern),
      ilike(users.handle, pattern),
    );
    if (keywordMatch) conditions.push(keywordMatch);
  }

  if (filters.vibe !== "any") conditions.push(eq(postings.vibe, filters.vibe));
  if (!options.excludeGames && filters.games.length > 0) {
    conditions.push(inArray(postings.game, filters.games));
  }
  if (filters.genres.length > 0) conditions.push(inArray(postings.genre, filters.genres));
  if (!options.excludeRegions && filters.regions.length > 0) {
    conditions.push(inArray(postings.region, filters.regions));
  }
  if (filters.timeSlots.length > 0) {
    conditions.push(arrayOverlaps(postings.timeSlots, filters.timeSlots));
  }
  if (filters.ageGroup !== "any") conditions.push(eq(postings.ageGroup, filters.ageGroup));
  if (filters.openSlots !== "any") {
    conditions.push(gte(postings.seatsOpen, OPEN_SLOTS_MIN[filters.openSlots]));
  }
  if (filters.platform !== "any") conditions.push(eq(postings.platform, filters.platform));
  if (filters.micRequired) conditions.push(eq(postings.micRequired, true));

  return conditions;
}

// FR-013/FR-014: only ever reads status = 'open'; sort among Recent /
// Open seats / Soonest. "Soonest" puts a null scheduledDate after every
// posting that has one (spec's Edge Cases), falling back to post
// recency among postings without a date.
export async function searchPostings(filters: BrowseFilters): Promise<BrowseResult[]> {
  const conditions = await buildFilterConditions(filters);

  const orderBy =
    filters.sort === "seats"
      ? [desc(postings.seatsOpen)]
      : filters.sort === "soon"
        ? [sql`${postings.scheduledDate} is null`, asc(postings.scheduledDate), desc(postings.createdAt)]
        : [desc(postings.createdAt)];

  const rows = await db
    .select({
      id: postings.id,
      hostHandle: users.handle,
      hostAvatarColor: users.avatarColor,
      game: postings.game,
      genre: postings.genre,
      title: postings.title,
      blurb: postings.blurb,
      vibe: postings.vibe,
      region: postings.region,
      timeSlots: postings.timeSlots,
      seatsTotal: postings.seatsTotal,
      seatsOpen: postings.seatsOpen,
      createdAt: postings.createdAt,
    })
    .from(postings)
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(and(...conditions))
    .orderBy(...orderBy);

  return rows.map((row) => ({ ...row, hostHandle: row.hostHandle ?? "player" }));
}
