import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, forumReplies, forumThreads, reports, users, warnings } from "@/db/schema";

// Same rationale as resolve-posting-report.test.ts: requireRole is
// hardcoded to reject every real session until Admin Settings (024)
// ships the role column; @/auth is separately mocked so requireAuth()
// succeeds with a real moderator user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { resolveForumReport } = await import("./resolve-forum-report");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `resolve-forum-mod-${runId}@example.com`;
const authorEmail = `resolve-forum-author-${runId}@example.com`;
const reporterEmail = `resolve-forum-reporter-${runId}@example.com`;
let moderatorId: string;
let authorId: string;
let reporterId: string;
const threadIds: string[] = [];
const replyIds: string[] = [];

async function seedThread() {
  const [thread] = await db
    .insert(forumThreads)
    .values({ categoryId: "general", authorId, title: "Test thread", body: "body" })
    .returning({ id: forumThreads.id });
  threadIds.push(thread.id);
  return thread.id;
}

async function seedReply(threadId: string) {
  const [reply] = await db.insert(forumReplies).values({ threadId, authorId, body: "reply body" }).returning({ id: forumReplies.id });
  replyIds.push(reply.id);
  return reply.id;
}

async function seedOpenReport(targetId: string) {
  await db.insert(reports).values({ reporterId, targetType: "forum", targetId, reason: "spam", status: "open" });
}

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(warnings).where(eq(warnings.moderatorId, moderatorId));
  await db.delete(reports).where(eq(reports.reporterId, reporterId));
  for (const id of replyIds) await db.delete(forumReplies).where(eq(forumReplies.id, id));
  for (const id of threadIds) await db.delete(forumThreads).where(eq(forumThreads.id, id));
  await db.delete(users).where(eq(users.id, moderatorId));
  await db.delete(users).where(eq(users.id, authorId));
  await db.delete(users).where(eq(users.id, reporterId));
});

describe("resolveForumReport", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `resolveforummod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    const [author] = await db
      .insert(users)
      .values({ email: authorEmail, handle: `resolveforumauthor${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `resolveforumreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const threadId = await seedThread();
    await seedOpenReport(threadId);

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(resolveForumReport({ targetType: "forumThread", targetId: threadId, resolution: "approve" })).rejects.toThrow();

    const [row] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, threadId));
    expect(row.status).toBe("open");
  });

  it("approves a thread: resolves open reports, marks reviewed, keeps it public, logs an audit entry", async () => {
    const threadId = await seedThread();
    await seedOpenReport(threadId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumThread", targetId: threadId, resolution: "approve" });
    expect(result).toEqual({ success: true });

    const [reportRow] = await db.select({ status: reports.status, resolvedAt: reports.resolvedAt }).from(reports).where(eq(reports.targetId, threadId));
    expect(reportRow.status).toBe("resolved");
    // Admin Reports (019, retroactive) -- set alongside status.
    expect(reportRow.resolvedAt).not.toBeNull();

    const [threadRow] = await db
      .select({ removedAt: forumThreads.removedAt, moderationReviewedAt: forumThreads.moderationReviewedAt })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));
    expect(threadRow.removedAt).toBeNull();
    expect(threadRow.moderationReviewedAt).not.toBeNull();

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, threadId), eq(auditEntries.action, "approved a forum thread")));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.category).toBe("moderation");
  });

  it("removes a reply: resolves open reports, sets removedAt (not moderationReviewedAt), logs an audit entry", async () => {
    const threadId = await seedThread();
    const replyId = await seedReply(threadId);
    await seedOpenReport(replyId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumReply", targetId: replyId, resolution: "remove" });
    expect(result).toEqual({ success: true });

    const [reportRow] = await db.select({ status: reports.status, resolvedAt: reports.resolvedAt }).from(reports).where(eq(reports.targetId, replyId));
    expect(reportRow.status).toBe("resolved");
    // Admin Reports (019, retroactive) -- the reply branch's own
    // separate UPDATE statement also gets it.
    expect(reportRow.resolvedAt).not.toBeNull();

    const [replyRow] = await db
      .select({ removedAt: forumReplies.removedAt, moderationReviewedAt: forumReplies.moderationReviewedAt })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId));
    expect(replyRow.removedAt).not.toBeNull();
    expect(replyRow.moderationReviewedAt).toBeNull();

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, replyId), eq(auditEntries.action, "removed a forum reply")));
    expect(entry.actorId).toBe(moderatorId);
  });

  it("locks a thread: sets locked, leaves the queue, logs an audit entry", async () => {
    const threadId = await seedThread();
    await seedOpenReport(threadId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumThread", targetId: threadId, resolution: "lock" });
    expect(result).toEqual({ success: true });

    const [threadRow] = await db.select({ locked: forumThreads.locked }).from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(threadRow.locked).toBe(true);

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, threadId), eq(auditEntries.action, "locked a forum thread")));
    expect(entry.actorId).toBe(moderatorId);
  });

  it("rejects locking a reply", async () => {
    const threadId = await seedThread();
    const replyId = await seedReply(threadId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumReply", targetId: replyId, resolution: "lock" });
    expect(result).toEqual({ success: false, error: "Only threads can be locked." });
  });

  it("warns an author (from a reply): resolves reports, marks reviewed, creates a warnings row with the generalized shape", async () => {
    const threadId = await seedThread();
    const replyId = await seedReply(threadId);
    await seedOpenReport(replyId);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumReply", targetId: replyId, resolution: "warn", warningReason: "repeat offense" });
    expect(result).toEqual({ success: true });

    const [replyRow] = await db
      .select({ removedAt: forumReplies.removedAt, moderationReviewedAt: forumReplies.moderationReviewedAt })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId));
    expect(replyRow.removedAt).toBeNull();
    expect(replyRow.moderationReviewedAt).not.toBeNull();

    const [warningRow] = await db
      .select()
      .from(warnings)
      .where(and(eq(warnings.targetType, "forumReply"), eq(warnings.targetId, replyId)));
    expect(warningRow.userId).toBe(authorId);
    expect(warningRow.moderatorId).toBe(moderatorId);
    expect(warningRow.reason).toBe("repeat offense");
  });

  it("returns an error for a nonexistent thread/reply", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await resolveForumReport({ targetType: "forumThread", targetId: crypto.randomUUID(), resolution: "approve" });
    expect(result).toEqual({ success: false, error: "Thread not found." });
  });
});
