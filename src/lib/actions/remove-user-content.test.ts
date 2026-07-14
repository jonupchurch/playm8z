import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, forumThreads, postings, users } from "@/db/schema";

// requireRole is mocked directly -- see toggle-user-ban.test.ts's own
// comment: its rank check is hardcoded to reject every real session
// until Admin Settings (024) adds the real `role` column. `@/auth` is
// separately mocked so requireAuth() (used to attribute the new
// Admin Postings 017 audit-log write to a real moderator row)
// succeeds with a real user.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { removeUserContent } = await import("./remove-user-content");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `remove-content-${runId}@example.com`;
const moderatorEmail = `remove-content-mod-${runId}@example.com`;
let userId: string;
let moderatorId: string;
let postingId: string;
let threadId: string;

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, moderatorId));
});

describe("removeUserContent", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    const [user] = await db
      .insert(users)
      .values({ email, handle: `removecontent${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: userId,
        game: "Test Game",
        title: "Test posting",
        blurb: "blurb",
        vibe: "casual",
        region: "na-west",
        seatsTotal: 4,
        seatsOpen: 4,
        status: "open",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    const [thread] = await db
      .insert(forumThreads)
      .values({ authorId: userId, categoryId: "general", title: "Test thread", body: "body" })
      .returning({ id: forumThreads.id });
    threadId = thread.id;

    const [moderator] = await db
      .insert(users)
      .values({ email: moderatorEmail, handle: `removecontentmod${runId}` })
      .returning({ id: users.id });
    moderatorId = moderator.id;

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(removeUserContent({ contentType: "posting", contentId: postingId })).rejects.toThrow();

    const [row] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, postingId));
    expect(row.removedAt).toBeNull();
  });

  it("marks a posting removed and logs an audit entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await removeUserContent({ contentType: "posting", contentId: postingId });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, postingId));
    expect(row.removedAt).not.toBeNull();

    const [entry] = await db.select().from(auditEntries).where(eq(auditEntries.targetId, postingId));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.action).toBe("removed a posting");
    expect(entry.targetLabel).toBe("Test posting");
  });

  it("marks a forum thread removed and logs an audit entry", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await removeUserContent({ contentType: "forumThread", contentId: threadId });
    expect(result).toEqual({ success: true });

    const [row] = await db
      .select({ removedAt: forumThreads.removedAt })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));
    expect(row.removedAt).not.toBeNull();

    const [entry] = await db.select().from(auditEntries).where(eq(auditEntries.targetId, threadId));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.action).toBe("removed a forum thread");
    expect(entry.targetLabel).toBe("Test thread");
  });

  it("rejects invalid input", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    mockedAuth.mockResolvedValueOnce(fakeSession(moderatorEmail));
    const result = await removeUserContent({ contentType: "reply" as never, contentId: postingId });
    expect(result.success).toBe(false);
  });
});
