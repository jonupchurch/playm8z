import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, forumThreads, messages, postings, reports, users } from "@/db/schema";
import { getReportsQueue } from "./get-reports-queue";

describe("getReportsQueue (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const reporterEmail = `reports-queue-reporter-${runId}@example.com`;
  const postingAuthorEmail = `reports-queue-posting-author-${runId}@example.com`;
  const threadAuthorEmail = `reports-queue-thread-author-${runId}@example.com`;
  const senderEmail = `reports-queue-sender-${runId}@example.com`;
  const profileEmail = `reports-queue-profile-${runId}@example.com`;
  let reporterId: string;
  let postingAuthorId: string;
  let threadAuthorId: string;
  let senderId: string;
  let profileId: string;
  let postingId: string;
  let threadId: string;
  let conversationId: string;
  let messageId: string;
  const reportIds: string[] = [];

  afterAll(async () => {
    for (const id of reportIds) await db.delete(reports).where(eq(reports.id, id));
    await db.delete(messages).where(eq(messages.id, messageId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, reporterId));
    await db.delete(users).where(eq(users.id, postingAuthorId));
    await db.delete(users).where(eq(users.id, threadAuthorId));
    await db.delete(users).where(eq(users.id, senderId));
    await db.delete(users).where(eq(users.id, profileId));
  });

  it("groups open reports by target, computes severity/stats, and filters by target type", async () => {
    const before = await getReportsQueue("all");

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `reportsqueuereporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const [postingAuthor] = await db
      .insert(users)
      .values({ email: postingAuthorEmail, handle: `reportsqueueposta${runId}` })
      .returning({ id: users.id });
    postingAuthorId = postingAuthor.id;

    const [threadAuthor] = await db
      .insert(users)
      .values({ email: threadAuthorEmail, handle: `reportsqueuethreada${runId}` })
      .returning({ id: users.id });
    threadAuthorId = threadAuthor.id;

    const [sender] = await db
      .insert(users)
      .values({ email: senderEmail, handle: `reportsqueuesender${runId}` })
      .returning({ id: users.id });
    senderId = sender.id;

    const [profile] = await db
      .insert(users)
      .values({ email: profileEmail, handle: `reportsqueueprofile${runId}`, bio: "hire me for boosting" })
      .returning({ id: users.id });
    profileId = profile.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: postingAuthorId,
        game: "Test Game",
        title: "Test posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 4,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({ categoryId: "general", authorId: threadAuthorId, title: "Test thread", body: "thread body" })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [conversation] = await db.insert(conversations).values({ memberIds: [senderId, reporterId] }).returning({ id: conversations.id });
    conversationId = conversation.id;

    const [message] = await db
      .insert(messages)
      .values({ conversationId, senderId, body: "cheap rank boosting dm me" })
      .returning({ id: messages.id });
    messageId = message.id;

    // A single batched INSERT's server-side defaultNow() shares one
    // transaction timestamp across every row with no client column
    // supplied -- both posting reports would tie (or worse, race
    // against this test process's own clock if only one side is
    // explicit). Setting BOTH client-side removes any dependency on
    // server clock/skew, making "impersonation reported first" unambiguous.
    const earlier = new Date(Date.now() - 100_000);
    const later = new Date();
    const inserted = await db
      .insert(reports)
      .values([
        {
          reporterId,
          targetType: "posting",
          targetId: postingId,
          reason: "impersonation",
          details: "faking a staff account",
          status: "open",
          createdAt: earlier,
        },
        { reporterId, targetType: "posting", targetId: postingId, reason: "spam", status: "open", createdAt: later },
        { reporterId, targetType: "forum", targetId: threadId, reason: "other", status: "open" },
        { reporterId, targetType: "message", targetId: messageId, reason: "harassment", status: "open" },
        { reporterId, targetType: "user", targetId: profileId, reason: "inappropriate", status: "open" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...inserted.map((r) => r.id));

    const after = await getReportsQueue("all");

    // Five distinct targets, but the posting's two reports group into one card.
    expect(after.stats.openCount - before.stats.openCount).toBe(4);
    // Posting (impersonation -> high, corrected mapping) and message (harassment -> high).
    expect(after.stats.highCount - before.stats.highCount).toBe(2);

    const postingRow = after.rows.find((row) => row.targetType === "posting" && row.targetId === postingId)!;
    expect(postingRow.reportCount).toBe(2);
    expect(postingRow.severity).toBe("high");
    expect(postingRow.note).toBe("faking a staff account");
    expect(postingRow.ownerHandle).toBe(`reportsqueueposta${runId}`);
    expect(postingRow.context).toBe("Test Game posting");

    const threadRow = after.rows.find((row) => row.targetType === "forum" && row.targetId === threadId)!;
    expect(threadRow.reportCount).toBe(1);
    expect(threadRow.severity).toBe("low");
    expect(threadRow.forumTargetType).toBe("forumThread");
    expect(threadRow.context).toBe("Thread");

    const messageRow = after.rows.find((row) => row.targetType === "message" && row.targetId === messageId)!;
    expect(messageRow.severity).toBe("high");
    expect(messageRow.context).toBe("Direct message");
    expect(messageRow.ownerHandle).toBe(`reportsqueuesender${runId}`);

    const profileRow = after.rows.find((row) => row.targetType === "user" && row.targetId === profileId)!;
    expect(profileRow.severity).toBe("med");
    expect(profileRow.context).toBe("Profile");
    expect(profileRow.snippet).toBe("hire me for boosting");

    const postingFilter = await getReportsQueue("posting");
    expect(postingFilter.rows.map((row) => row.targetId)).toContain(postingId);
    expect(postingFilter.rows.every((row) => row.targetType === "posting")).toBe(true);

    const userFilter = await getReportsQueue("user");
    expect(userFilter.rows.map((row) => row.targetId)).toContain(profileId);
    expect(userFilter.rows.every((row) => row.targetType === "user")).toBe(true);
  });

  it("computes resolvedTodayCount and avgResponseMinutes from reports.resolvedAt", async () => {
    const before = await getReportsQueue("all");

    const [reporter] = await db
      .insert(users)
      .values({ email: `reports-queue-resolved-${runId}@example.com`, handle: `reportsqueueresolved${runId}` })
      .returning({ id: users.id });

    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [resolvedReport] = await db
      .insert(reports)
      .values({
        reporterId: reporter.id,
        targetType: "user",
        targetId: reporter.id,
        reason: "other",
        status: "resolved",
        createdAt: anHourAgo,
        resolvedAt: new Date(),
      })
      .returning({ id: reports.id });

    const after = await getReportsQueue("all");
    expect(after.stats.resolvedTodayCount - before.stats.resolvedTodayCount).toBe(1);
    expect(after.stats.avgResponseMinutes).not.toBeNull();

    await db.delete(reports).where(eq(reports.id, resolvedReport.id));
    await db.delete(users).where(eq(users.id, reporter.id));
  });
});
