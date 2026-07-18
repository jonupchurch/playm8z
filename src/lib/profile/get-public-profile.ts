import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, reviews, userGames, users } from "@/db/schema";

export type PublicProfileOpenPosting = {
  id: string;
  game: string;
  title: string;
  vibe: string;
  seatsTotal: number;
  seatsOpen: number;
};

export type PublicProfileReview = {
  id: string;
  reviewerHandle: string;
  reviewerAvatarColor: string | null;
  reviewerAvatarImage: string | null;
  reviewerImage: string | null;
  rating: number;
  text: string | null;
  game: string | null;
  createdAt: Date;
};

export type PublicProfile = {
  id: string;
  handle: string;
  bio: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
  region: string | null;
  ageGroup: string | null;
  platforms: string[];
  createdAt: Date;
  deactivatedAt: Date | null;
  // Admin Settings (024)/research.md #7: the real gap fix -- honored by
  // the page's own sidebar, not by hiding the value here (the owner's
  // own view of their own profile always sees everything).
  showRegion: boolean;
  showAgeGroup: boolean;
  games: string[];
  openPostings: PublicProfileOpenPosting[];
  reviews: PublicProfileReview[];
  stats: { sessions: number; avgRating: number | null; reviewCount: number };
};

// FR-001/research.md #2: identity/bio/stats (incl. the computed
// `sessions` proxy) + games + this user's currently-open hosted
// postings + reviews (display-only, research.md #6). Games read from
// `userGames` (Profile/007's own per-user-editable list, kept current
// by addUserGame/removeUserGame), NOT `users.gamesPlayed` -- data-
// model.md names the latter, but that flat array is set once at
// onboarding and never updated afterward by any later feature, so it
// would show a stale snapshot rather than what this user actually
// plays now (only the `game` field is read, per FR-003's dropped
// per-game rank/hours).
export async function getPublicProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const [user] = await db
    .select({
      id: users.id,
      handle: users.handle,
      bio: users.bio,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
      region: users.region,
      ageGroup: users.ageGroup,
      platforms: users.platforms,
      createdAt: users.createdAt,
      deactivatedAt: users.deactivatedAt,
      showRegion: users.privacyShowRegion,
      showAgeGroup: users.privacyShowAge,
    })
    .from(users)
    .where(eq(users.handle, handle));

  if (!user) return null;

  const [gameRows, openPostingRows, reviewRows, acceptedApplications, closedOrFullPostings, reviewAgg] =
    await Promise.all([
      db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, user.id)),
      db
        .select({
          id: postings.id,
          game: postings.game,
          title: postings.title,
          vibe: postings.vibe,
          seatsTotal: postings.seatsTotal,
          seatsOpen: postings.seatsOpen,
        })
        .from(postings)
        .where(and(eq(postings.hostId, user.id), eq(postings.status, "open"), isNull(postings.removedAt)))
        .orderBy(desc(postings.createdAt)),
      db
        .select({
          id: reviews.id,
          reviewerHandle: users.handle,
          reviewerAvatarColor: users.avatarColor,
          reviewerAvatarImage: users.avatarImage,
          reviewerImage: users.image,
          rating: reviews.rating,
          text: reviews.text,
          game: reviews.game,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.revieweeId, user.id))
        .orderBy(desc(reviews.createdAt)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(and(eq(applications.applicantId, user.id), eq(applications.status, "accepted"))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(postings)
        .where(and(eq(postings.hostId, user.id), inArray(postings.status, ["full", "closed"]))),
      db
        .select({ avg: sql<number | null>`avg(${reviews.rating})::float`, count: sql<number>`count(*)::int` })
        .from(reviews)
        .where(eq(reviews.revieweeId, user.id)),
    ]);

  const sessions = (acceptedApplications[0]?.count ?? 0) + (closedOrFullPostings[0]?.count ?? 0);

  return {
    id: user.id,
    handle: user.handle ?? FALLBACK_HANDLE,
    bio: user.bio,
    avatarColor: user.avatarColor,
    avatarImage: user.avatarImage,
    image: user.image,
    region: user.region,
    ageGroup: user.ageGroup,
    platforms: user.platforms ?? [],
    createdAt: user.createdAt,
    deactivatedAt: user.deactivatedAt,
    showRegion: user.showRegion,
    showAgeGroup: user.showAgeGroup,
    games: gameRows.map((row) => row.game),
    openPostings: openPostingRows,
    reviews: reviewRows.map((row) => ({ ...row, reviewerHandle: row.reviewerHandle ?? FALLBACK_HANDLE })),
    stats: {
      sessions,
      avgRating: reviewAgg[0]?.avg ?? null,
      reviewCount: reviewAgg[0]?.count ?? 0,
    },
  };
}
