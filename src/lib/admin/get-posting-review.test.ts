import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users, warnings } from "@/db/schema";
import { getPostingReview } from "./get-posting-review";

describe("getPostingReview (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const authorEmail = `posting-review-author-${runId}@example.com`;
  const reporterEmail = `posting-review-reporter-${runId}@example.com`;
  const moderatorEmail = `posting-review-moderator-${runId}@example.com`;
  let authorId: string;
  let reporterId: string;
  let moderatorId: string;
  let postingId: string;
  let reportId: string;
  let warningId: string;

  afterAll(async () => {
    await db.delete(warnings).where(eq(warnings.id, warningId));
    await db.delete(reports).where(eq(reports.id, reportId));
    await db.delete(postings).where(eq(postings.hostId, authorId));
    await db.delete(users).where(eq(users.id, authorId));
    await db.delete(users).where(eq(users.id, reporterId));
    await db.delete(users).where(eq(users.id, moderatorId));
  });

  it("returns null for a nonexistent posting", async () => {
    const result = await getPostingReview("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the full posting, why-it's-here reports, and an accurate author card", async () => {
    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `postingreviewauthor${runId}`, avatarColor: "amber-orange" })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `postingreviewreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `postingreviewmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: authorId,
        game: "Test Game",
        title: "Reviewed posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 4,
        status: "open",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
        autoFlagReason: "boosting_service",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    const [report] = await db
      .insert(reports)
      .values({ reporterId, targetType: "posting", targetId: postingId, reason: "harassment", status: "open" })
      .returning({ id: reports.id });
    reportId = report.id;

    const [warning] = await db
      .insert(warnings)
      .values({ userId: authorId, moderatorId, reason: "prior offense" })
      .returning({ id: warnings.id });
    warningId = warning.id;

    const review = await getPostingReview(postingId);
    expect(review).not.toBeNull();
    expect(review!.title).toBe("Reviewed posting");
    expect(review!.autoFlagReason).toBe("boosting_service");
    expect(review!.severity).toBe("high");
    expect(review!.reports).toEqual([{ reason: "harassment", reporterHandle: `postingreviewreporter${runId}` }]);
    expect(review!.authorHandle).toBe(`postingreviewauthor${runId}`);
    expect(review!.authorAvatarColor).toBe("amber-orange");
    expect(review!.priorWarnings).toBe(1);
    expect(review!.totalPosts).toBe(1);
  });
});
