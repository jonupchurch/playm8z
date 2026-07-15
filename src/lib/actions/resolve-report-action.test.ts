import { afterAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, conversations, forumReplies, forumThreads, messages, postings, reports, users, warnings } from "@/db/schema";

// Same rationale as resolve-forum-report.test.ts/resolve-posting-report.test.ts:
// requireRole is hardcoded to reject every real session until Admin
// Settings (024) ships the role column; @/auth is separately mocked so
// requireAuth() succeeds with a real moderator user. Both mocks are
// persistent (mockResolvedValue, not Once) since a delegated posting/
// forum call fans out into a second internal call to each.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { resolveReportAction } = await import("./resolve-report-action");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `resolve-report-mod-${runId}@example.com`;
const reporterEmail = `resolve-report-reporter-${runId}@example.com`;
const postingAuthorEmail = `resolve-report-posting-author-${runId}@example.com`;
const threadAuthorEmail = `resolve-report-thread-author-${runId}@example.com`;
const senderEmail = `resolve-report-sender-${runId}@example.com`;
const profileEmail = `resolve-report-profile-${runId}@example.com`;
let moderatorId: string;
let reporterId: string;
let postingAuthorId: string;
let threadAuthorId: string;
let senderId: string;
let profileId: string;
const conversationIds: string[] = [];

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(warnings).where(eq(warnings.moderatorId, moderatorId));
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

describe("resolveReportAction", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [moderator] = await db.insert(users).values({ email: moderatorEmail, handle: `resolvereportmod${runId}` }).returning({ id: users.id });
    moderatorId = moderator.id;
    const [reporter] = await db.insert(users).values({ email: reporterEmail, handle: `resolvereportreporter${runId}` }).returning({ id: users.id });
    reporterId = reporter.id;
    const [postingAuthor] = await db
      .insert(users)
      .values({ email: postingAuthorEmail, handle: `resolvereportposta${runId}` })
      .returning({ id: users.id });
    postingAuthorId = postingAuthor.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(resolveReportAction({ targetType: "user", targetId: reporterId, resolution: "warn" })).rejects.toThrow();
  });

  it("delegates a posting-target remove to 017's own resolvePostingReport", async () => {
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
    const result = await resolveReportAction({ targetType: "posting", targetId: posting.id, resolution: "remove" });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, posting.id));
    expect(row.removedAt).not.toBeNull();
    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, posting.id));
    expect(reportRow.status).toBe("resolved");
  });

  it("delegates a forum-target warn to 018's own resolveForumReport, after classifying thread vs. reply", async () => {
    const [threadAuthor] = await db
      .insert(users)
      .values({ email: threadAuthorEmail, handle: `resolvereportthreada${runId}` })
      .returning({ id: users.id });
    threadAuthorId = threadAuthor.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({ categoryId: "general", authorId: threadAuthorId, title: "Test thread", body: "body" })
      .returning({ id: forumThreads.id });
    const [reply] = await db.insert(forumReplies).values({ threadId: thread.id, authorId: threadAuthorId, body: "reply body" }).returning({ id: forumReplies.id });
    await db.insert(reports).values({ reporterId, targetType: "forum", targetId: reply.id, reason: "spam", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await resolveReportAction({ targetType: "forum", targetId: reply.id, resolution: "warn", warningReason: "repeat offense" });
    expect(result).toEqual({ success: true });

    const [warningRow] = await db.select().from(warnings).where(and(eq(warnings.targetType, "forumReply"), eq(warnings.targetId, reply.id)));
    expect(warningRow.userId).toBe(threadAuthorId);
    expect(warningRow.reason).toBe("repeat offense");
  });

  it("removes a message directly, resolving its open reports without deleting the row", async () => {
    const [sender] = await db.insert(users).values({ email: senderEmail, handle: `resolvereportsender${runId}` }).returning({ id: users.id });
    senderId = sender.id;
    const [conversation] = await db.insert(conversations).values({ memberIds: [senderId, reporterId] }).returning({ id: conversations.id });
    conversationIds.push(conversation.id);
    const [message] = await db.insert(messages).values({ conversationId: conversation.id, senderId, body: "spam dm" }).returning({ id: messages.id });
    await db.insert(reports).values({ reporterId, targetType: "message", targetId: message.id, reason: "spam", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await resolveReportAction({ targetType: "message", targetId: message.id, resolution: "remove" });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ removedAt: messages.removedAt, body: messages.body }).from(messages).where(eq(messages.id, message.id));
    expect(row.removedAt).not.toBeNull();
    expect(row.body).toBe("spam dm"); // row itself is never deleted

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, message.id));
    expect(reportRow.status).toBe("resolved");

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, message.id), eq(auditEntries.action, "removed a message")));
    expect(entry.actorId).toBe(moderatorId);
  });

  it("warns a message's author, creating a warnings row with targetType='message'", async () => {
    const [conversation] = await db.insert(conversations).values({ memberIds: [senderId, reporterId] }).returning({ id: conversations.id });
    conversationIds.push(conversation.id);
    const [message] = await db.insert(messages).values({ conversationId: conversation.id, senderId, body: "another dm" }).returning({ id: messages.id });
    await db.insert(reports).values({ reporterId, targetType: "message", targetId: message.id, reason: "harassment", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const result = await resolveReportAction({ targetType: "message", targetId: message.id, resolution: "warn" });
    expect(result).toEqual({ success: true });

    const [warningRow] = await db.select().from(warnings).where(and(eq(warnings.targetType, "message"), eq(warnings.targetId, message.id)));
    expect(warningRow.userId).toBe(senderId);

    const [row] = await db.select({ removedAt: messages.removedAt }).from(messages).where(eq(messages.id, message.id));
    expect(row.removedAt).toBeNull(); // warn never removes content
  });

  it("rejects Remove for a profile (user) target, but allows Warn (targetType/targetId both null)", async () => {
    const [profile] = await db.insert(users).values({ email: profileEmail, handle: `resolvereportprofile${runId}` }).returning({ id: users.id });
    profileId = profile.id;
    await db.insert(reports).values({ reporterId, targetType: "user", targetId: profileId, reason: "inappropriate", status: "open" });

    mockedRequireRole.mockResolvedValue(undefined);
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    const removeResult = await resolveReportAction({ targetType: "user", targetId: profileId, resolution: "remove" });
    expect(removeResult).toEqual({ success: false, error: "Remove content is not available for profile reports." });

    const warnResult = await resolveReportAction({ targetType: "user", targetId: profileId, resolution: "warn", warningReason: "bio issue" });
    expect(warnResult).toEqual({ success: true });

    const [warningRow] = await db.select().from(warnings).where(and(eq(warnings.userId, profileId), eq(warnings.reason, "bio issue")));
    expect(warningRow.targetType).toBeNull();
    expect(warningRow.targetId).toBeNull();

    const [reportRow] = await db.select({ status: reports.status }).from(reports).where(eq(reports.targetId, profileId));
    expect(reportRow.status).toBe("resolved");
  });
});
