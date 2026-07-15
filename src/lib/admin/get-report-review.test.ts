import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, forumReplies, forumThreads, messages, postings, reports, users, warnings } from "@/db/schema";
import { getReportReview } from "./get-report-review";

describe("getReportReview (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const reporterEmail = `report-review-reporter-${runId}@example.com`;
  const reporter2Email = `report-review-reporter2-${runId}@example.com`;
  const authorEmail = `report-review-author-${runId}@example.com`;
  const moderatorEmail = `report-review-mod-${runId}@example.com`;
  let reporterId: string;
  let reporter2Id: string;
  let authorId: string;
  let moderatorId: string;
  let postingId: string;
  let threadId: string;
  let replyId: string;
  let conversationId: string;
  let messageId: string;
  const reportIds: string[] = [];
  const warningIds: string[] = [];

  afterAll(async () => {
    for (const id of warningIds) await db.delete(warnings).where(eq(warnings.id, id));
    for (const id of reportIds) await db.delete(reports).where(eq(reports.id, id));
    await db.delete(messages).where(eq(messages.id, messageId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(eq(users.id, reporterId));
    await db.delete(users).where(eq(users.id, reporter2Id));
    await db.delete(users).where(eq(users.id, authorId));
    await db.delete(users).where(eq(users.id, moderatorId));
  });

  it("returns null for a target with no open reports", async () => {
    await expect(getReportReview("posting", crypto.randomUUID())).resolves.toBeNull();
  });

  it("builds the drawer's full content, incl. the cross-source total-reports aggregate", async () => {
    const [reporter] = await db.insert(users).values({ email: reporterEmail, handle: `reportreviewreporter${runId}` }).returning({ id: users.id });
    reporterId = reporter.id;
    const [reporter2] = await db
      .insert(users)
      .values({ email: reporter2Email, handle: `reportreviewreporter2${runId}` })
      .returning({ id: users.id });
    reporter2Id = reporter2.id;
    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `reportreviewauthor${runId}`, createdAt: new Date("2025-01-01") })
      .returning({ id: users.id });
    authorId = author.id;
    const [moderator] = await db.insert(users).values({ email: moderatorEmail, handle: `reportreviewmod${runId}` }).returning({ id: users.id });
    moderatorId = moderator.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: authorId,
        game: "Test Game",
        title: "Test posting",
        blurb: "blurb text",
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
      .values({ categoryId: "general", authorId, title: "Test thread", body: "thread body" })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [reply] = await db.insert(forumReplies).values({ threadId, authorId, body: "reply body" }).returning({ id: forumReplies.id });
    replyId = reply.id;

    const [conversation] = await db.insert(conversations).values({ memberIds: [authorId, reporterId] }).returning({ id: conversations.id });
    conversationId = conversation.id;
    const [message] = await db.insert(messages).values({ conversationId, senderId: authorId, body: "message body" }).returning({ id: messages.id });
    messageId = message.id;

    // Two open reports on the posting (one with a note, the earlier of
    // the two -- the representative), plus one open report each on the
    // thread/reply/message, all by the same author -- so "total reports"
    // aggregates across all four.
    const earlier = new Date(Date.now() - 100_000);
    const later = new Date();
    const inserted = await db
      .insert(reports)
      .values([
        { reporterId, targetType: "posting", targetId: postingId, reason: "spam", details: "spam note", status: "open", createdAt: earlier },
        { reporterId: reporter2Id, targetType: "posting", targetId: postingId, reason: "harassment", status: "open", createdAt: later },
        { reporterId, targetType: "forum", targetId: threadId, reason: "other", status: "open" },
        { reporterId, targetType: "forum", targetId: replyId, reason: "other", status: "open" },
        { reporterId, targetType: "message", targetId: messageId, reason: "other", status: "open" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...inserted.map((r) => r.id));

    const [warning] = await db
      .insert(warnings)
      .values({ userId: authorId, moderatorId, targetType: "posting", targetId: postingId, reason: "prior issue" })
      .returning({ id: warnings.id });
    warningIds.push(warning.id);

    const postingReview = await getReportReview("posting", postingId);
    expect(postingReview).not.toBeNull();
    expect(postingReview!.reportCount).toBe(2);
    expect(postingReview!.othersCount).toBe(1);
    expect(postingReview!.note).toBe("spam note");
    expect(postingReview!.severity).toBe("high"); // worst of spam(med)/harassment(high)
    expect(postingReview!.context).toBe("Test Game posting");
    expect(postingReview!.crossLinkHref).toBe(`/admin/postings?postingId=${postingId}`);
    expect(postingReview!.ownerHandle).toBe(`reportreviewauthor${runId}`);
    expect(postingReview!.priorWarnings).toBe(1);
    // 2 posting + 1 thread + 1 reply + 1 message = 5.
    expect(postingReview!.totalReports).toBe(5);

    const threadReview = await getReportReview("forum", threadId);
    expect(threadReview!.forumTargetType).toBe("forumThread");
    expect(threadReview!.context).toBe("Thread");
    expect(threadReview!.crossLinkHref).toBe(`/admin/forum?targetType=forumThread&targetId=${threadId}`);
    expect(threadReview!.totalReports).toBe(5);

    const replyReview = await getReportReview("forum", replyId);
    expect(replyReview!.forumTargetType).toBe("forumReply");
    expect(replyReview!.context).toBe(`Reply in "Test thread"`);

    const messageReview = await getReportReview("message", messageId);
    expect(messageReview!.crossLinkHref).toBeNull();
    expect(messageReview!.context).toBe("Direct message");

    const profileReview = await getReportReview("user", authorId);
    expect(profileReview).toBeNull(); // no direct open report against the profile itself
  });
});
