import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, likes, users } from "@/db/schema";
import { getThread } from "./get-thread";

describe("getThread (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const authorEmail = `thread-author-${runId}@example.com`;
  const otherEmail = `thread-other-${runId}@example.com`;
  const viewerEmail = `thread-viewer-${runId}@example.com`;

  let authorId: string;
  let viewerId: string;
  let threadId: string;
  let otherThreadId: string;
  let replyOldId: string;
  let replyNewId: string;
  let replyTopId: string;

  beforeAll(async () => {
    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `threadauthor${runId}`, region: "eu-west" })
      .returning({ id: users.id });
    authorId = author.id;

    const [other] = await db
      .insert(users)
      .values({ email: otherEmail, handle: `threadother${runId}` })
      .returning({ id: users.id });

    const [viewer] = await db
      .insert(users)
      .values({ email: viewerEmail, handle: `threadviewer${runId}` })
      .returning({ id: users.id });
    viewerId = viewer.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({
        authorId,
        categoryId: "gametalk",
        title: `Meta debate ${runId}`,
        body: "What's the best comp?",
        tags: [`tag-${runId}`],
      })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [otherThread] = await db
      .insert(forumThreads)
      .values({
        authorId,
        categoryId: "gametalk",
        title: `Related thread ${runId}`,
        body: "Sharing the same category.",
        tags: [],
      })
      .returning({ id: forumThreads.id });
    otherThreadId = otherThread.id;

    const [replyOld] = await db
      .insert(forumReplies)
      .values({
        threadId,
        authorId: other.id,
        body: "First reply",
        likes: 1,
        createdAt: new Date(Date.now() - 60 * 60_000),
      })
      .returning({ id: forumReplies.id });
    replyOldId = replyOld.id;

    const [replyNew] = await db
      .insert(forumReplies)
      .values({
        threadId,
        authorId: other.id,
        body: "Second reply",
        likes: 2,
        createdAt: new Date(Date.now() - 10 * 60_000),
      })
      .returning({ id: forumReplies.id });
    replyNewId = replyNew.id;

    const [replyTop] = await db
      .insert(forumReplies)
      .values({
        threadId,
        authorId,
        body: "OP's own reply, most liked",
        likes: 10,
        createdAt: new Date(Date.now() - 30 * 60_000),
      })
      .returning({ id: forumReplies.id });
    replyTopId = replyTop.id;

    await db.insert(likes).values({ userId: viewerId, targetType: "reply", targetId: replyTopId });
  });

  afterAll(async () => {
    await db.delete(likes).where(eq(likes.userId, viewerId));
    await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
    await db.delete(forumThreads).where(eq(forumThreads.authorId, authorId));
    await db.delete(users).where(eq(users.email, authorEmail));
    await db.delete(users).where(eq(users.email, otherEmail));
    await db.delete(users).where(eq(users.email, viewerEmail));
  });

  it("returns null for a nonexistent thread", async () => {
    const result = await getThread("00000000-0000-0000-0000-000000000000", "top");
    expect(result).toBeNull();
  });

  it("marks the thread author's reply as OP", async () => {
    const thread = await getThread(threadId, "top");
    const opReply = thread!.replies.find((r) => r.id === replyTopId);
    expect(opReply!.isOP).toBe(true);
    const nonOpReply = thread!.replies.find((r) => r.id === replyOldId);
    expect(nonOpReply!.isOP).toBe(false);
  });

  it("sorts by likes descending for 'top'", async () => {
    const thread = await getThread(threadId, "top");
    expect(thread!.replies.map((r) => r.id)).toEqual([replyTopId, replyNewId, replyOldId]);
  });

  it("sorts newest-first for 'new'", async () => {
    const thread = await getThread(threadId, "new");
    expect(thread!.replies.map((r) => r.id)).toEqual([replyNewId, replyTopId, replyOldId]);
  });

  it("sorts oldest-first for 'old'", async () => {
    const thread = await getThread(threadId, "old");
    expect(thread!.replies.map((r) => r.id)).toEqual([replyOldId, replyTopId, replyNewId]);
  });

  it("reflects the viewer's own likes on replies but not for an anonymous viewer", async () => {
    const asViewer = await getThread(threadId, "top", viewerId);
    const likedReply = asViewer!.replies.find((r) => r.id === replyTopId);
    expect(likedReply!.likedByViewer).toBe(true);
    const unlikedReply = asViewer!.replies.find((r) => r.id === replyOldId);
    expect(unlikedReply!.likedByViewer).toBe(false);

    const anonymous = await getThread(threadId, "top");
    expect(anonymous!.replies.every((r) => r.likedByViewer === false)).toBe(true);
  });

  it("carries the quoted reply's author and body", async () => {
    const [quotingReply] = await db
      .insert(forumReplies)
      .values({ threadId, authorId, body: "Quoting reply", quotedReplyId: replyOldId })
      .returning({ id: forumReplies.id });

    const thread = await getThread(threadId, "top");
    const quoting = thread!.replies.find((r) => r.id === quotingReply.id);
    expect(quoting!.quotedBody).toBe("First reply");
    expect(quoting!.quotedAuthorHandle).toBe(`threadother${runId}`);
  });

  it("finds a related thread sharing the same category", async () => {
    const thread = await getThread(threadId, "top");
    expect(thread!.relatedThreads.some((r) => r.id === otherThreadId)).toBe(true);
  });

  it("doesn't throw for a thread posted with no tags (arrayOverlaps requires a non-empty array)", async () => {
    const [untaggedThread] = await db
      .insert(forumThreads)
      .values({
        authorId,
        categoryId: "gametalk",
        title: `No tags ${runId}`,
        body: "Posted with the Tags field left blank.",
        tags: [],
      })
      .returning({ id: forumThreads.id });

    const thread = await getThread(untaggedThread.id, "top");
    expect(thread).not.toBeNull();
    expect(thread!.relatedThreads.some((r) => r.id === otherThreadId)).toBe(true);

    await db.delete(forumThreads).where(eq(forumThreads.id, untaggedThread.id));
  });
});
