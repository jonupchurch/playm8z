import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, users, warnings } from "@/db/schema";
import { getForumReview } from "./get-forum-review";

describe("getForumReview (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const authorEmail = `forum-review-author-${runId}@example.com`;
  const reporterEmail = `forum-review-reporter-${runId}@example.com`;
  const opEmail = `forum-review-op-${runId}@example.com`;
  let authorId: string;
  let reporterId: string;
  let opId: string;
  const threadIds: string[] = [];
  const replyIds: string[] = [];

  afterAll(async () => {
    await db.delete(warnings).where(eq(warnings.userId, authorId));
    for (const id of replyIds) await db.delete(forumReplies).where(eq(forumReplies.id, id));
    for (const id of threadIds) await db.delete(forumThreads).where(eq(forumThreads.id, id));
    await db.delete(users).where(eq(users.id, authorId));
    await db.delete(users).where(eq(users.id, reporterId));
    await db.delete(users).where(eq(users.id, opId));
  });

  it("returns null for a nonexistent thread or reply", async () => {
    expect(await getForumReview("forumThread", crypto.randomUUID())).toBeNull();
    expect(await getForumReview("forumReply", crypto.randomUUID())).toBeNull();
  });

  it("returns full drawer data for a reported, auto-flagged, previously-warned thread", async () => {
    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `forumreviewauthor${runId}`, createdAt: new Date("2026-02-01") })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `forumreviewreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const [op] = await db.insert(users).values({ email: opEmail, handle: `forumreviewop${runId}` }).returning({ id: users.id });
    opId = op.id;

    await db.insert(warnings).values({ userId: authorId, moderatorId: authorId, targetType: "posting", targetId: crypto.randomUUID(), reason: "prior" });

    const [thread] = await db
      .insert(forumThreads)
      .values({ categoryId: "gametalk", authorId: opId, title: "OP thread", body: "OP body" })
      .returning({ id: forumThreads.id });
    threadIds.push(thread.id);

    const [firstReply] = await db
      .insert(forumReplies)
      .values({ threadId: thread.id, authorId, body: "first reply body", autoFlagReason: "boosting_service" })
      .returning({ id: forumReplies.id });
    replyIds.push(firstReply.id);

    await db.insert(reports).values({ reporterId, targetType: "forum", targetId: firstReply.id, reason: "harassment", status: "open" });

    const review = await getForumReview("forumReply", firstReply.id);
    expect(review).not.toBeNull();
    expect(review!.type).toBe("forumReply");
    expect(review!.categoryId).toBe("gametalk");
    expect(review!.threadTitle).toBe("OP thread");
    expect(review!.content).toBe("first reply body");
    expect(review!.severity).toBe("high");
    expect(review!.reports).toEqual([{ reason: "harassment", reporterHandle: `forumreviewreporter${runId}` }]);
    // First reply in the thread -- preceding context falls back to the OP.
    expect(review!.precedingContext).toEqual({ authorHandle: `forumreviewop${runId}`, content: "OP body" });
    expect(review!.authorHandle).toBe(`forumreviewauthor${runId}`);
    expect(review!.priorWarnings).toBe(1);
    expect(review!.forumPosts).toBe(1);

    const [secondReply] = await db
      .insert(forumReplies)
      .values({ threadId: thread.id, authorId, body: "second reply body" })
      .returning({ id: forumReplies.id });
    replyIds.push(secondReply.id);

    const secondReview = await getForumReview("forumReply", secondReply.id);
    // A later reply's preceding context is the immediately-earlier reply, not the OP.
    expect(secondReview!.precedingContext).toEqual({ authorHandle: `forumreviewauthor${runId}`, content: "first reply body" });
    expect(secondReview!.reports).toEqual([]);
    expect(secondReview!.forumPosts).toBe(2);

    const threadReview = await getForumReview("forumThread", thread.id);
    expect(threadReview!.type).toBe("forumThread");
    expect(threadReview!.precedingContext).toBeNull();
    expect(threadReview!.content).toBe("OP body");
  });
});
