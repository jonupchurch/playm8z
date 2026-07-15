import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, users } from "@/db/schema";

// Same rationale as ban-posting-author.test.ts: requireRole is
// hardcoded to reject every real session until Admin Settings (024)
// ships the role column; @/auth is mocked so requireAuth() (used
// internally by resolveForumReport, which this action delegates the
// "remove" half of its work to) succeeds with a real user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { banForumAuthor } = await import("./ban-forum-author");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `ban-forum-mod-${runId}@example.com`;
let moderatorId: string;

afterAll(async () => {
  await db.delete(users).where(eq(users.email, moderatorEmail));
});

async function seedAuthorAndThread(alreadyBanned: boolean, runSuffix: string) {
  const [author] = await db
    .insert(users)
    .values({ email: `ban-forum-author-${runSuffix}@example.com`, handle: `banforumauthor${runSuffix}`, bannedAt: alreadyBanned ? new Date() : null })
    .returning({ id: users.id });

  const [thread] = await db
    .insert(forumThreads)
    .values({ categoryId: "general", authorId: author.id, title: "Test thread", body: "body" })
    .returning({ id: forumThreads.id });

  return { authorId: author.id, threadId: thread.id };
}

describe("banForumAuthor", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `banforummod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    const { authorId, threadId } = await seedAuthorAndThread(false, `${runId}-a`);

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(banForumAuthor({ targetType: "forumThread", targetId: threadId })).rejects.toThrow();

    const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(row.bannedAt).toBeNull();

    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("bans a not-yet-banned author and removes the thread under review", async () => {
    const { authorId, threadId } = await seedAuthorAndThread(false, `${runId}-b`);
    await db.insert(reports).values({ reporterId: moderatorId, targetType: "forum", targetId: threadId, reason: "harassment", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banForumAuthor({ targetType: "forumThread", targetId: threadId });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(authorRow.bannedAt).not.toBeNull();

    const [threadRow] = await db.select({ removedAt: forumThreads.removedAt }).from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(threadRow.removedAt).not.toBeNull();

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, threadId));
    expect(reportRow.status).toBe("resolved");

    await db.delete(reports).where(eq(reports.targetId, threadId));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("bans an author from a reply and removes the reply under review", async () => {
    const { authorId, threadId } = await seedAuthorAndThread(false, `${runId}-d`);
    const [reply] = await db.insert(forumReplies).values({ threadId, authorId, body: "reply body" }).returning({ id: forumReplies.id });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banForumAuthor({ targetType: "forumReply", targetId: reply.id });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(authorRow.bannedAt).not.toBeNull();

    const [replyRow] = await db.select({ removedAt: forumReplies.removedAt }).from(forumReplies).where(eq(forumReplies.id, reply.id));
    expect(replyRow.removedAt).not.toBeNull();

    await db.delete(forumReplies).where(eq(forumReplies.id, reply.id));
    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("does not accidentally unban an author who is already banned", async () => {
    const { authorId, threadId } = await seedAuthorAndThread(true, `${runId}-c`);

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banForumAuthor({ targetType: "forumThread", targetId: threadId });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, authorId));
    expect(authorRow.bannedAt).not.toBeNull();

    await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("returns an error for a nonexistent thread", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await banForumAuthor({ targetType: "forumThread", targetId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "Thread not found." });
  });
});
