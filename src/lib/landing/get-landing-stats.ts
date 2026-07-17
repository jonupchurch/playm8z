import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";
import { getAutoHideCondition } from "@/lib/moderation/auto-hide";
import { getSettings } from "@/lib/settings/get-settings";
import type { ListingCardPosting } from "@/components/listings/listing-card";

// 030 FR-006: the genre is whatever the admin's list currently holds,
// so this is a plain string rather than a union of a compile-time const.
export type GenreCount = { genre: string; count: number };

export type LandingStats = {
  openPartiesNow: number;
  totalPlayers: number;
  gamesAndTables: number;
  partiesFormedThisWeek: number;
  heroPostings: ListingCardPosting[];
  genreCounts: GenreCount[];
};

const HERO_POSTING_LIMIT = 2;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// FR-004: only ever open, non-removed, non-deactivated-host, non-auto-
// hidden postings -- the same "real, live right now" condition set
// Home's/Browse's own open-postings queries already use, since this
// feature's hero card/genre counts show a specific host's identity and
// must never surface content those pages themselves would hide.
async function getOpenPostingConditions() {
  const conditions = [eq(postings.status, "open"), isNull(users.deactivatedAt), isNull(postings.removedAt)];
  const autoHideCondition = await getAutoHideCondition("posting", postings.id);
  if (autoHideCondition) conditions.push(autoHideCondition);
  return conditions;
}

// FR-003/FR-004/FR-005/FR-006 (research.md #1-#2, #4, #7): every
// number on this page is a real, live aggregate computed at render
// time -- no online-presence tracking, no average-rating (Public
// Profile's, 022, Review entity has no writer yet), no fabricated
// example content. "Games & tables" deliberately counts ALL postings
// ever (a catalog-breadth stat, data-model.md's literal form), not
// just currently-open ones -- distinct from every other stat here,
// which reflects "right now."
export async function getLandingStats(): Promise<LandingStats> {
  const conditions = await getOpenPostingConditions();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [[openPartiesRow], [totalPlayersRow], [gamesRow], [partiesThisWeekRow], heroRows, genreRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(postings)
      .innerJoin(users, eq(postings.hostId, users.id))
      .where(and(...conditions)),
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(distinct ${postings.game})::int` }).from(postings),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(applications)
      .where(gte(applications.acceptedAt, sevenDaysAgo)),
    db
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
      .orderBy(sql`${postings.createdAt} desc`)
      .limit(HERO_POSTING_LIMIT),
    db
      .select({ genre: postings.genre, n: sql<number>`count(*)::int` })
      .from(postings)
      .innerJoin(users, eq(postings.hostId, users.id))
      .where(and(...conditions))
      .groupBy(postings.genre),
  ]);

  // FR-006: counts are reported over the admin's current list, not a
  // hardcoded one. A posting whose genre has since been retired simply
  // isn't counted here -- it keeps its genre and still displays (FR-007),
  // it just has no row on a landing page that only shows offered genres.
  const { genres } = await getSettings();
  const countsByGenre = new Map(genreRows.map((row) => [row.genre, row.n]));
  const genreCounts: GenreCount[] = genres.map((genre) => ({ genre, count: countsByGenre.get(genre) ?? 0 }));

  return {
    openPartiesNow: openPartiesRow.n,
    totalPlayers: totalPlayersRow.n,
    gamesAndTables: gamesRow.n,
    partiesFormedThisWeek: partiesThisWeekRow.n,
    heroPostings: heroRows.map((row) => ({ ...row, hostHandle: row.hostHandle ?? "player" })),
    genreCounts,
  };
}
