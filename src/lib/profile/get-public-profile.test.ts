import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, reviews, userGames, users } from "@/db/schema";
import { getPublicProfileByHandle } from "./get-public-profile";

describe("getPublicProfileByHandle (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const ownerHandle = `gppowner${runId}`;
  const reviewerHandle = `gppreviewer${runId}`;
  const applicantHandle = `gppapplicant${runId}`;
  let ownerId: string;
  let reviewerId: string;
  let applicantId: string;
  let openPostingId: string;
  let closedPostingId: string;
  let userGameId: string;
  let reviewId: string;
  let applicationId: string;

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.id, applicationId));
    await db.delete(reviews).where(eq(reviews.id, reviewId));
    await db.delete(userGames).where(eq(userGames.id, userGameId));
    await db.delete(postings).where(eq(postings.id, openPostingId));
    await db.delete(postings).where(eq(postings.id, closedPostingId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, reviewerId));
    await db.delete(users).where(eq(users.id, applicantId));
  });

  it("returns null for a nonexistent handle", async () => {
    const result = await getPublicProfileByHandle(`no-such-handle-${runId}`);
    expect(result).toBeNull();
  });

  it("returns identity/bio, games (from userGames, not gamesPlayed), open postings, reviews, and computed sessions", async () => {
    const [owner] = await db
      .insert(users)
      .values({
        email: `gpp-owner-${runId}@example.com`,
        handle: ownerHandle,
        bio: "Test bio",
        avatarColor: "amber-orange",
        region: "na-west",
        ageGroup: "18",
        platforms: ["pc"],
      })
      .returning({ id: users.id });
    ownerId = owner.id;

    const [reviewer] = await db
      .insert(users)
      .values({ email: `gpp-reviewer-${runId}@example.com`, handle: reviewerHandle })
      .returning({ id: users.id });
    reviewerId = reviewer.id;

    const [applicant] = await db
      .insert(users)
      .values({ email: `gpp-applicant-${runId}@example.com`, handle: applicantHandle })
      .returning({ id: users.id });
    applicantId = applicant.id;

    const [userGame] = await db
      .insert(userGames)
      .values({ userId: ownerId, game: "Real Current Game" })
      .returning({ id: userGames.id });
    userGameId = userGame.id;

    const [openPosting] = await db
      .insert(postings)
      .values({
        hostId: ownerId,
        game: "Valorant",
        title: "Open party",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 2,
        status: "open",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    openPostingId = openPosting.id;

    const [closedPosting] = await db
      .insert(postings)
      .values({
        hostId: ownerId,
        game: "Valorant",
        title: "Closed party",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 0,
        status: "closed",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    closedPostingId = closedPosting.id;

    const [application] = await db
      .insert(applications)
      .values({ postingId: openPostingId, applicantId: ownerId, status: "accepted" })
      .returning({ id: applications.id });
    applicationId = application.id;
    // (owner is the applicant here for a DIFFERENT posting's roster --
    // sessions counts accepted applications where THIS user is the
    // applicant, independent of who hosts what)

    const [review] = await db
      .insert(reviews)
      .values({ revieweeId: ownerId, reviewerId, rating: 5, text: "Great teammate", game: "Valorant" })
      .returning({ id: reviews.id });
    reviewId = review.id;

    const profile = await getPublicProfileByHandle(ownerHandle);
    expect(profile).not.toBeNull();
    if (!profile) return;

    expect(profile.bio).toBe("Test bio");
    expect(profile.region).toBe("na-west");
    expect(profile.ageGroup).toBe("18");
    expect(profile.platforms).toEqual(["pc"]);
    // Admin Settings (024)/research.md #7: privacy preferences pass
    // through unchanged (default true here) -- the page decides
    // whether to render Region/Age group.
    expect(profile.showRegion).toBe(true);
    expect(profile.showAgeGroup).toBe(true);

    // Games come from userGames, the single source of truth (ADR 0015).
    expect(profile.games).toEqual(["Real Current Game"]);

    expect(profile.openPostings.map((p) => p.id)).toEqual([openPostingId]);
    expect(profile.openPostings.some((p) => p.id === closedPostingId)).toBe(false);

    expect(profile.reviews).toHaveLength(1);
    expect(profile.reviews[0].reviewerHandle).toBe(reviewerHandle);
    expect(profile.reviews[0].rating).toBe(5);
    expect(profile.stats.reviewCount).toBe(1);
    expect(profile.stats.avgRating).toBe(5);

    // sessions = 1 accepted application (as applicant) + 1 closed/full hosted posting
    expect(profile.stats.sessions).toBe(2);
  });

  it("passes through a false privacy preference (024/research.md #7)", async () => {
    const handle = `gppprivate${runId}`;
    const [privateUser] = await db
      .insert(users)
      .values({
        email: `gpp-private-${runId}@example.com`,
        handle,
        region: "na-west",
        ageGroup: "18",
        privacyShowRegion: false,
        privacyShowAge: false,
      })
      .returning({ id: users.id });

    const profile = await getPublicProfileByHandle(handle);
    expect(profile?.showRegion).toBe(false);
    expect(profile?.showAgeGroup).toBe(false);

    await db.delete(users).where(eq(users.id, privateUser.id));
  });
});
