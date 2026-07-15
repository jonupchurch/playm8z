import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, conversations, forumThreads, messages, postings, reports, users } from "@/db/schema";

// Same rationale as ban-forum-author.test.ts/ban-posting-author.test.ts:
// requireRole is hardcoded to reject every real session until Admin
// Settings (024) ships the role column; @/auth is mocked so
// requireAuth() (used internally by toggleUserBan/resolveReportAction,
// which this action delegates to) succeeds with a real moderator user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { banReportedUser } = await import("./ban-reported-user");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `ban-reported-mod-${runId}@example.com`;
let moderatorId: string;
let reporterId: string;
let postingAuthorId: string;
let threadAuthorId: string;
let senderId: string;
let profileId: string;
const conversationIds: string[] = [];

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(reports).where(eq(reports.reporterId, reporterId));
  await db.delete(postings).where(eq(postings.hostId, postingAuthorId));
  await db.delete(forumThreads).where(eq(forumThreads.authorId, threadAuthorId));
  for (const id of conversationIds) await db.delete(conversations).where(eq(conversations.id, id));
  await db.delete(users).where(eq(users.id, moderatorId));
  await db.delete(users).where(eq(users.id, reporterId));
  await db.delete(users).where(eq(users.id, postingAuthorId));
  await db.delete(users).where(eq(users.id, threadAuthorId));
  await db.delete(users).where(eq(users.id, senderId));
  await db.delete(users).where(eq(users.id, profileId));
});

describe("banReportedUser", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db.insert(users).values({ email: moderatorEmail, handle: `banreportedmod${runId}` }).returning({ id: users.id });
    moderatorId = moderator.id;
    const [reporter] = await db
      .insert(users)
      .values({ email: `ban-reported-reporter-${runId}@example.com`, handle: `banreportedreporter${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;
    const [profile] = await db
      .insert(users)
      .values({ email: `ban-reported-profile-${runId}@example.com`, handle: `banreportedprofile${runId}` })
      .returning({ id: users.id });
    profileId = profile.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(banReportedUser({ targetType: "user", targetId: profileId })).rejects.toThrow();

    const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, profileId));
    expect(row.bannedAt).toBeNull();
  });

  it("bans via a posting target: bans the host and removes that posting", async () => {
    const [postingAuthor] = await db
      .insert(users)
      .values({ email: `ban-reported-posting-author-${runId}@example.com`, handle: `banreportedposta${runId}` })
      .returning({ id: users.id });
    postingAuthorId = postingAuthor.id;
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
    await db.insert(reports).values({ reporterId, targetType: "posting", targetId: posting.id, reason: "spam", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banReportedUser({ targetType: "posting", targetId: posting.id });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, postingAuthorId));
    expect(authorRow.bannedAt).not.toBeNull();
    const [postingRow] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, posting.id));
    expect(postingRow.removedAt).not.toBeNull();
  });

  it("bans via a forum target: classifies thread vs. reply and bans the actual author", async () => {
    const [threadAuthor] = await db
      .insert(users)
      .values({ email: `ban-reported-thread-author-${runId}@example.com`, handle: `banreportedthreada${runId}` })
      .returning({ id: users.id });
    threadAuthorId = threadAuthor.id;
    const [thread] = await db
      .insert(forumThreads)
      .values({ categoryId: "general", authorId: threadAuthorId, title: "Test thread", body: "body" })
      .returning({ id: forumThreads.id });
    await db.insert(reports).values({ reporterId, targetType: "forum", targetId: thread.id, reason: "harassment", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banReportedUser({ targetType: "forum", targetId: thread.id });
    expect(result).toEqual({ success: true });

    const [authorRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, threadAuthorId));
    expect(authorRow.bannedAt).not.toBeNull();
    const [threadRow] = await db.select({ removedAt: forumThreads.removedAt }).from(forumThreads).where(eq(forumThreads.id, thread.id));
    expect(threadRow.removedAt).not.toBeNull();
  });

  it("bans via a message target: bans the sender and removes the message", async () => {
    const [sender] = await db
      .insert(users)
      .values({ email: `ban-reported-sender-${runId}@example.com`, handle: `banreportedsender${runId}` })
      .returning({ id: users.id });
    senderId = sender.id;
    const [conversation] = await db.insert(conversations).values({ memberIds: [senderId, reporterId] }).returning({ id: conversations.id });
    conversationIds.push(conversation.id);
    const [message] = await db.insert(messages).values({ conversationId: conversation.id, senderId, body: "threat dm" }).returning({ id: messages.id });
    await db.insert(reports).values({ reporterId, targetType: "message", targetId: message.id, reason: "harassment", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banReportedUser({ targetType: "message", targetId: message.id });
    expect(result).toEqual({ success: true });

    const [senderRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, senderId));
    expect(senderRow.bannedAt).not.toBeNull();
    const [messageRow] = await db.select({ removedAt: messages.removedAt }).from(messages).where(eq(messages.id, message.id));
    expect(messageRow.removedAt).not.toBeNull();
  });

  it("bans via a profile target: account-only, no content-removal side effect", async () => {
    await db.insert(reports).values({ reporterId, targetType: "user", targetId: profileId, reason: "impersonation", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banReportedUser({ targetType: "user", targetId: profileId });
    expect(result).toEqual({ success: true });

    const [profileRow] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, profileId));
    expect(profileRow.bannedAt).not.toBeNull();

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, profileId));
    expect(reportRow.status).toBe("resolved");
  });

  it("does not accidentally unban an already-banned author", async () => {
    // profileId is already banned from the previous test.
    const before = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, profileId));
    await db.insert(reports).values({ reporterId, targetType: "user", targetId: profileId, reason: "other", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await banReportedUser({ targetType: "user", targetId: profileId });
    expect(result).toEqual({ success: true });

    const after = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, profileId));
    expect(after[0].bannedAt?.getTime()).toBe(before[0].bannedAt?.getTime());
  });

  it("returns an error for a nonexistent posting", async () => {
    mockedRequireRole.mockResolvedValue(undefined);
    const result = await banReportedUser({ targetType: "posting", targetId: crypto.randomUUID() });
    expect(result).toEqual({ success: false, error: "Posting not found." });
  });
});
