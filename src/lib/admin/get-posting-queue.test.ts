import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, reports, users } from "@/db/schema";
import { getPostingQueue } from "./get-posting-queue";

describe("getPostingQueue (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const authorEmail = `posting-queue-author-${runId}@example.com`;
  const reporterEmail = `posting-queue-reporter-${runId}@example.com`;
  let authorId: string;
  let reporterId: string;
  let reportedId: string;
  let flaggedId: string;
  let bothId: string;
  let neitherId: string;
  let reviewedFlaggedId: string;
  const reportIds: string[] = [];

  afterAll(async () => {
    for (const id of reportIds) {
      await db.delete(reports).where(eq(reports.id, id));
    }
    await db.delete(postings).where(eq(postings.hostId, authorId));
    await db.delete(users).where(eq(users.id, authorId));
    await db.delete(users).where(eq(users.id, reporterId));
  });

  it("computes accurate queue membership, stats, filters, and severity", async () => {
    const before = await getPostingQueue("all");

    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `postingqueueauthor${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `postingqueuereporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const common = {
      hostId: authorId,
      game: "Test Game",
      blurb: "blurb",
      vibe: "casual",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 4,
      status: "open" as const,
      ageGroup: "18" as const,
      timeSlots: ["evening"],
      platform: "pc",
    };

    const [reportedPosting, flaggedPosting, bothPosting, neitherPosting, reviewedFlaggedPosting] = await Promise.all([
      db.insert(postings).values({ ...common, title: "Reported posting" }).returning({ id: postings.id }),
      db
        .insert(postings)
        .values({ ...common, title: "Flagged posting", autoFlagReason: "boosting_service" })
        .returning({ id: postings.id }),
      db
        .insert(postings)
        .values({ ...common, title: "Both posting", autoFlagReason: "new_account_first_post" })
        .returning({ id: postings.id }),
      db.insert(postings).values({ ...common, title: "Neither posting" }).returning({ id: postings.id }),
      db
        .insert(postings)
        .values({
          ...common,
          title: "Already reviewed flagged posting",
          autoFlagReason: "boosting_service",
          moderationReviewedAt: new Date(),
        })
        .returning({ id: postings.id }),
    ]);
    reportedId = reportedPosting[0].id;
    flaggedId = flaggedPosting[0].id;
    bothId = bothPosting[0].id;
    neitherId = neitherPosting[0].id;
    reviewedFlaggedId = reviewedFlaggedPosting[0].id;

    const insertedReports = await db
      .insert(reports)
      .values([
        { reporterId, targetType: "posting", targetId: reportedId, reason: "harassment", status: "open" },
        { reporterId, targetType: "posting", targetId: bothId, reason: "spam", status: "open" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...insertedReports.map((r) => r.id));

    const after = await getPostingQueue("all");

    expect(after.stats.inQueue - before.stats.inQueue).toBe(3);
    expect(after.stats.reportedCount - before.stats.reportedCount).toBe(2);
    expect(after.stats.flaggedCount - before.stats.flaggedCount).toBe(1);

    const ids = after.rows.map((r) => r.id);
    expect(ids).toContain(reportedId);
    expect(ids).toContain(flaggedId);
    expect(ids).toContain(bothId);
    expect(ids).not.toContain(neitherId);
    expect(ids).not.toContain(reviewedFlaggedId);

    const reportedFilter = await getPostingQueue("reported");
    const reportedIds = reportedFilter.rows.map((r) => r.id);
    expect(reportedIds).toContain(reportedId);
    expect(reportedIds).toContain(bothId);
    expect(reportedIds).not.toContain(flaggedId);

    const flaggedFilter = await getPostingQueue("flagged");
    const flaggedIds = flaggedFilter.rows.map((r) => r.id);
    expect(flaggedIds).toContain(flaggedId);
    expect(flaggedIds).not.toContain(bothId);
    expect(flaggedIds).not.toContain(reportedId);

    const reportedRow = after.rows.find((r) => r.id === reportedId)!;
    expect(reportedRow.severity).toBe("high");
    expect(reportedRow.reports).toEqual([{ reason: "harassment", reporterHandle: `postingqueuereporter${runId}` }]);

    const flaggedRow = after.rows.find((r) => r.id === flaggedId)!;
    expect(flaggedRow.severity).toBe("high");

    const bothRow = after.rows.find((r) => r.id === bothId)!;
    expect(bothRow.severity).toBe("med");
  });
});
