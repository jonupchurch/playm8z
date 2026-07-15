import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { REGIONS, type BrowseFilters } from "@/lib/validations/browse-filters";
import { buildFilterConditions } from "./search-postings";

export type FacetCount = { value: string; count: number };

// FR-004/edge case: the option list is every distinct value among ALL
// currently-open postings (never disappears), but each option's count
// reflects every OTHER active facet (never the Game/Region facet's own
// selection) -- so a filter combination can validly drop an option's
// count to 0 without removing it from the list.
//
// Both queries below join `users` even though neither selects anything
// from it -- buildFilterConditions' keyword-search condition can
// reference users.handle (matching a host's handle, same as the main
// search), which requires the join to exist in every query that uses it.
export async function getGameFacetCounts(filters: BrowseFilters): Promise<FacetCount[]> {
  const allGames = await db
    .selectDistinct({ game: postings.game })
    .from(postings)
    .where(eq(postings.status, "open"));

  const conditions = await buildFilterConditions(filters, { excludeGames: true });
  const counts = await db
    .select({ game: postings.game, count: sql<number>`count(*)::int` })
    .from(postings)
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(and(...conditions))
    .groupBy(postings.game);

  const countByGame = new Map(counts.map((row) => [row.game, row.count]));
  return allGames
    .map((row) => ({ value: row.game, count: countByGame.get(row.game) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export async function getRegionFacetCounts(filters: BrowseFilters): Promise<FacetCount[]> {
  const conditions = await buildFilterConditions(filters, { excludeRegions: true });
  const counts = await db
    .select({ region: postings.region, count: sql<number>`count(*)::int` })
    .from(postings)
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(and(...conditions))
    .groupBy(postings.region);

  const countByRegion = new Map(counts.map((row) => [row.region, row.count]));
  return REGIONS.map((region) => ({ value: region, count: countByRegion.get(region) ?? 0 }));
}
