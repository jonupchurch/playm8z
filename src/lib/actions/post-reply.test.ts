import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { postReply } = await import("./post-reply");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `reply-verified-${runId}@example.com`;
const unverifiedEmail = `reply-unverified-${runId}@example.com`;

let authorId: string;
let threadId: string;
let existingReplyId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [author] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `replyverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  authorId = author.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `replyunverified${runId}` });

  const [thread] = await db
    .insert(forumThreads)
    .values({ authorId, categoryId: "general", title: `Thread ${runId}`, body: "body" })
    .returning({ id: forumThreads.id });
  threadId = thread.id;

  const [existing] = await db
    .insert(forumReplies)
    .values({ threadId, authorId, body: "Existing reply" })
    .returning({ id: forumReplies.id });
  existingReplyId = existing.id;
});

afterAll(async () => {
  await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("postReply", () => {
  it("creates a reply and increments the thread's replyCount", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await postReply({ threadId, body: "My first reply" });
    expect(result.success).toBe(true);

    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(thread.replyCount).toBe(1);
  });

  it("carries quotedReplyId when posted via Quote", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await postReply({ threadId, body: "Quoting you", quotedReplyId: existingReplyId });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select().from(forumReplies).where(eq(forumReplies.id, result.id));
    expect(row.quotedReplyId).toBe(existingReplyId);
  });

  it("rejects an empty body", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await postReply({ threadId, body: "" });
    expect(result.success).toBe(false);
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await postReply({ threadId, body: "Should not be created" });
    expect(result.success).toBe(false);

    const rows = await db.select().from(forumReplies).where(eq(forumReplies.body, "Should not be created"));
    expect(rows).toHaveLength(0);
  });

  it("flags a scam-pattern reply (Admin Forum, 018)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await postReply({ threadId, body: "Click here to claim now" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select({ autoFlagReason: forumReplies.autoFlagReason }).from(forumReplies).where(eq(forumReplies.id, result.id));
    expect(row.autoFlagReason).toBe("phishing_or_scam");
  });

  it("flags a brand-new account's first-ever reply", async () => {
    const newAuthorEmail = `reply-newauthor-${runId}@example.com`;
    const [newAuthor] = await db
      .insert(users)
      .values({ email: newAuthorEmail, handle: `replynewauthor${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(newAuthorEmail));
    const result = await postReply({ threadId, body: "Hi, just found this thread!" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select({ autoFlagReason: forumReplies.autoFlagReason }).from(forumReplies).where(eq(forumReplies.id, result.id));
    expect(row.autoFlagReason).toBe("new_account_first_post");

    await db.delete(forumReplies).where(eq(forumReplies.id, result.id));
    await db.delete(users).where(eq(users.id, newAuthor.id));
  });

  it("rejects a reply to a locked thread (Admin Forum, 018 research.md #6)", async () => {
    const [lockedThread] = await db
      .insert(forumThreads)
      .values({ authorId, categoryId: "general", title: `Locked thread ${runId}`, body: "body", locked: true })
      .returning({ id: forumThreads.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await postReply({ threadId: lockedThread.id, body: "Should be rejected" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/locked/i);

    const rows = await db.select().from(forumReplies).where(eq(forumReplies.threadId, lockedThread.id));
    expect(rows).toHaveLength(0);

    await db.delete(forumThreads).where(eq(forumThreads.id, lockedThread.id));
  });
});
