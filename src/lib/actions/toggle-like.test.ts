import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, likes, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleLike } = await import("./toggle-like");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `like-verified-${runId}@example.com`;
const unverifiedEmail = `like-unverified-${runId}@example.com`;

let userId: string;
let threadId: string;
let replyId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `likeverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = user.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `likeunverified${runId}` });

  const [thread] = await db
    .insert(forumThreads)
    .values({ authorId: userId, categoryId: "general", title: `Thread ${runId}`, body: "body" })
    .returning({ id: forumThreads.id });
  threadId = thread.id;

  const [reply] = await db
    .insert(forumReplies)
    .values({ threadId, authorId: userId, body: "A reply" })
    .returning({ id: forumReplies.id });
  replyId = reply.id;
});

afterAll(async () => {
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("toggleLike", () => {
  it("likes the thread and increments its denormalized count", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleLike({ targetType: "thread", targetId: threadId });
    expect(result).toEqual({ success: true, liked: true });

    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(thread.likes).toBe(1);
  });

  it("unlikes the thread and decrements the count", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleLike({ targetType: "thread", targetId: threadId });
    expect(result).toEqual({ success: true, liked: false });

    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(thread.likes).toBe(0);
  });

  it("likes a reply and increments its denormalized count", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleLike({ targetType: "reply", targetId: replyId });
    expect(result).toEqual({ success: true, liked: true });

    const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.id, replyId));
    expect(reply.likes).toBe(1);

    // Restore for the next test.
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    await toggleLike({ targetType: "reply", targetId: replyId });
  });

  it("the database's own unique constraint rejects a duplicate like row (research.md #2)", async () => {
    // Firing two concurrent toggleLike() calls isn't a reliable way to
    // test this: since toggle semantics mean a second request that
    // sees the first's already-committed insert takes the *unlike*
    // branch instead, not a duplicate-insert attempt (a real, order-
    // dependent outcome of rapid toggling, not what this constraint
    // guards against). The actual enforcement point is the unique
    // constraint itself -- tested directly here, independent of
    // timing.
    await db.insert(likes).values({ userId, targetType: "reply", targetId: replyId });
    await expect(db.insert(likes).values({ userId, targetType: "reply", targetId: replyId })).rejects.toThrow();
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.targetId, replyId)));
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleLike({ targetType: "thread", targetId: threadId });
    expect(result.success).toBe(false);
  });

  it("keeps the denormalized count consistent with the like rows under a raced double-unlike", async () => {
    // Clean, liked baseline: count 1, one like row.
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.targetId, threadId)));
    await db.update(forumThreads).set({ likes: 0 }).where(eq(forumThreads.id, threadId));

    mockedAuth.mockResolvedValue(fakeSession(verifiedEmail));
    await toggleLike({ targetType: "thread", targetId: threadId });

    // Two concurrent unlikes: the losing DELETE removes no row, so the
    // count must not be decremented twice. Pre-fix this drove likes to -1.
    await Promise.all([
      toggleLike({ targetType: "thread", targetId: threadId }),
      toggleLike({ targetType: "thread", targetId: threadId }),
    ]);
    mockedAuth.mockReset();

    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    const rows = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.targetId, threadId)));
    // The invariant the bug violated: the denormalized count equals the
    // real number of like rows and never goes negative, in every interleaving.
    expect(thread.likes).toBeGreaterThanOrEqual(0);
    expect(thread.likes).toBe(rows.length);

    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.targetId, threadId)));
    await db.update(forumThreads).set({ likes: 0 }).where(eq(forumThreads.id, threadId));
  });
});
