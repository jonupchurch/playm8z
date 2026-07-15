import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, forumReplies, forumThreads, reports, settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";
import { getForumQueue } from "./get-forum-queue";

async function setAutoEscalateSeverity(value: "low" | "med" | "high") {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await db.insert(settings).values({ autoEscalateSeverity: value });
  } else {
    await db.update(settings).set({ autoEscalateSeverity: value }).where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
}

describe("getForumQueue (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const authorEmail = `forum-queue-author-${runId}@example.com`;
  const reporterEmail = `forum-queue-reporter-${runId}@example.com`;
  let authorId: string;
  let reporterId: string;
  const threadIds: string[] = [];
  const replyIds: string[] = [];
  const reportIds: string[] = [];

  afterAll(async () => {
    for (const id of reportIds) await db.delete(reports).where(eq(reports.id, id));
    for (const id of replyIds) await db.delete(forumReplies).where(eq(forumReplies.id, id));
    for (const id of threadIds) await db.delete(forumThreads).where(eq(forumThreads.id, id));
    await db.delete(auditEntries).where(eq(auditEntries.actorId, authorId));
    await db.delete(users).where(eq(users.id, authorId));
    await db.delete(users).where(eq(users.id, reporterId));
  });

  it("computes accurate queue membership, stats, filters, and severity across threads and replies", async () => {
    await setAutoEscalateSeverity("high");
    const before = await getForumQueue("all");

    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `forumqueueauthor${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `forumqueuereporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const [reportedThread, flaggedThread, neitherThread, reviewedFlaggedThread] = await Promise.all([
      db.insert(forumThreads).values({ categoryId: "general", authorId, title: "Reported thread", body: "body" }).returning({ id: forumThreads.id }),
      db
        .insert(forumThreads)
        .values({ categoryId: "offtopic", authorId, title: "Flagged thread", body: "body", autoFlagReason: "boosting_service" })
        .returning({ id: forumThreads.id }),
      db.insert(forumThreads).values({ categoryId: "general", authorId, title: "Neither thread", body: "body" }).returning({ id: forumThreads.id }),
      db
        .insert(forumThreads)
        .values({ categoryId: "general", authorId, title: "Reviewed flagged thread", body: "body", autoFlagReason: "boosting_service", moderationReviewedAt: new Date() })
        .returning({ id: forumThreads.id }),
    ]);
    threadIds.push(reportedThread[0].id, flaggedThread[0].id, neitherThread[0].id, reviewedFlaggedThread[0].id);

    const [bothReply] = await db
      .insert(forumReplies)
      .values({ threadId: reportedThread[0].id, authorId, body: "reply body", autoFlagReason: "new_account_first_post" })
      .returning({ id: forumReplies.id });
    replyIds.push(bothReply.id);

    const insertedReports = await db
      .insert(reports)
      .values([
        { reporterId, targetType: "forum", targetId: reportedThread[0].id, reason: "harassment", status: "open" },
        { reporterId, targetType: "forum", targetId: bothReply.id, reason: "spam", status: "open" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...insertedReports.map((r) => r.id));

    const after = await getForumQueue("all");

    expect(after.stats.inQueue - before.stats.inQueue).toBe(3);
    expect(after.stats.reportedCount - before.stats.reportedCount).toBe(2);
    expect(after.stats.flaggedCount - before.stats.flaggedCount).toBe(1);

    const ids = after.rows.map((r) => r.id);
    expect(ids).toContain(reportedThread[0].id);
    expect(ids).toContain(flaggedThread[0].id);
    expect(ids).toContain(bothReply.id);
    expect(ids).not.toContain(neitherThread[0].id);
    expect(ids).not.toContain(reviewedFlaggedThread[0].id);

    const threadsFilter = await getForumQueue("threads");
    const threadFilterIds = threadsFilter.rows.map((r) => r.id);
    expect(threadFilterIds).toContain(reportedThread[0].id);
    expect(threadFilterIds).toContain(flaggedThread[0].id);
    expect(threadFilterIds).not.toContain(bothReply.id);

    const repliesFilter = await getForumQueue("replies");
    const replyFilterIds = repliesFilter.rows.map((r) => r.id);
    expect(replyFilterIds).toContain(bothReply.id);
    expect(replyFilterIds).not.toContain(reportedThread[0].id);

    const flaggedFilter = await getForumQueue("flagged");
    const flaggedFilterIds = flaggedFilter.rows.map((r) => r.id);
    expect(flaggedFilterIds).toContain(flaggedThread[0].id);
    expect(flaggedFilterIds).not.toContain(bothReply.id);
    expect(flaggedFilterIds).not.toContain(reportedThread[0].id);

    const reportedRow = after.rows.find((r) => r.id === reportedThread[0].id)!;
    expect(reportedRow.type).toBe("forumThread");
    expect(reportedRow.severity).toBe("high");
    expect(reportedRow.reports).toEqual([{ reason: "harassment", reporterHandle: `forumqueuereporter${runId}` }]);
    expect(reportedRow.needsBanReview).toBe(true);

    const flaggedRow = after.rows.find((r) => r.id === flaggedThread[0].id)!;
    expect(flaggedRow.severity).toBe("high");

    const bothRow = after.rows.find((r) => r.id === bothReply.id)!;
    expect(bothRow.type).toBe("forumReply");
    expect(bothRow.threadTitle).toBe("Reported thread");
    expect(bothRow.categoryId).toBe("general");
    expect(bothRow.severity).toBe("med");
    expect(bothRow.needsBanReview).toBe(false);
  });
});
