import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, postings, users } from "@/db/schema";

// requireRole is mocked directly -- see toggle-user-ban.test.ts's own
// comment: its rank check is hardcoded to reject every real session
// until Admin Settings (024) adds the real `role` column.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { removeUserContent } = await import("./remove-user-content");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `remove-content-${runId}@example.com`;
let userId: string;
let postingId: string;
let threadId: string;

afterAll(async () => {
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.id, userId));
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

    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(removeUserContent({ contentType: "posting", contentId: postingId })).rejects.toThrow();

    const [row] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, postingId));
    expect(row.removedAt).toBeNull();
  });

  it("marks a posting removed", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await removeUserContent({ contentType: "posting", contentId: postingId });
    expect(result).toEqual({ success: true });

    const [row] = await db.select({ removedAt: postings.removedAt }).from(postings).where(eq(postings.id, postingId));
    expect(row.removedAt).not.toBeNull();
  });

  it("marks a forum thread removed", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await removeUserContent({ contentType: "forumThread", contentId: threadId });
    expect(result).toEqual({ success: true });

    const [row] = await db
      .select({ removedAt: forumThreads.removedAt })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));
    expect(row.removedAt).not.toBeNull();
  });

  it("rejects invalid input", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await removeUserContent({ contentType: "reply" as never, contentId: postingId });
    expect(result.success).toBe(false);
  });
});
