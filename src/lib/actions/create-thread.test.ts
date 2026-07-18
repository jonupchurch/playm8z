import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, notifications, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { createThread } = await import("./create-thread");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `thread-verified-${runId}@example.com`;
const unverifiedEmail = `thread-unverified-${runId}@example.com`;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const validInput = {
  categoryId: "gametalk" as const,
  title: `Meta discussion ${runId}`,
  body: "What's the current best composition?",
  tags: "valorant, meta",
};

beforeAll(async () => {
  await db.insert(users).values([
    { email: verifiedEmail, handle: `threadverified${runId}`, emailVerified: new Date() },
    { email: unverifiedEmail, handle: `threadunverified${runId}` },
  ]);
});

afterAll(async () => {
  await db.delete(forumThreads).where(eq(forumThreads.title, validInput.title));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("createThread", () => {
  it("creates a thread with default pinned/locked/counts for a verified user", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createThread(validInput);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select().from(forumThreads).where(eq(forumThreads.id, result.id));
    expect(row.categoryId).toBe("gametalk");
    expect(row.tags).toEqual(["valorant", "meta"]);
    expect(row.pinned).toBe(false);
    expect(row.locked).toBe(false);
    expect(row.replyCount).toBe(0);
    expect(row.viewCount).toBe(0);
    expect(row.likes).toBe(0);
    // Admin Forum (018): this fixture account is brand-new and this is
    // its first-ever forum content, so it correctly gets auto-flagged.
    expect(row.autoFlagReason).toBe("new_account_first_post");
  });

  it("flags a scam-pattern thread regardless of account age or post count", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createThread({ ...validInput, title: `${validInput.title}-scam`, body: "Click here to claim now" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select({ autoFlagReason: forumThreads.autoFlagReason }).from(forumThreads).where(eq(forumThreads.id, result.id));
    expect(row.autoFlagReason).toBe("phishing_or_scam");
  });

  it("does not flag a second, unremarkable thread from the same (still-new) account", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createThread({ ...validInput, title: `${validInput.title}-second` });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db.select({ autoFlagReason: forumThreads.autoFlagReason }).from(forumThreads).where(eq(forumThreads.id, result.id));
    expect(row.autoFlagReason).toBeNull();
  });

  it("rejects an invalid category", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createThread({ ...validInput, categoryId: "bogus" as never });
    expect(result.success).toBe(false);
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await createThread({ ...validInput, title: `${validInput.title}-unverified` });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/verify/i);

    const rows = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.title, `${validInput.title}-unverified`));
    expect(rows).toHaveLength(0);
  });

  it("rejects when not authenticated at all", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await createThread({ ...validInput, title: `${validInput.title}-anon` });
    expect(result.success).toBe(false);
  });

  it("notifies a mentioned user but not the self-mentioning author (040)", async () => {
    const [target] = await db
      .insert(users)
      .values({ email: `thread-target-${runId}@example.com`, handle: `threadtarget${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await createThread({
      ...validInput,
      title: `${validInput.title}-mention`,
      body: `hey @threadtarget${runId} and @threadverified${runId} check this`,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const targetNotifs = await db.select().from(notifications).where(eq(notifications.userId, target.id));
    expect(targetNotifs.filter((n) => n.type === "mention")).toHaveLength(1);
    expect(targetNotifs[0].targetRef).toBe(`/forum/thread/${result.id}`);

    // The author @mentioned themselves — no self-notification.
    const [author] = await db.select({ id: users.id }).from(users).where(eq(users.email, verifiedEmail));
    const authorNotifs = await db.select().from(notifications).where(eq(notifications.userId, author.id));
    expect(authorNotifs).toHaveLength(0);

    await db.delete(forumThreads).where(eq(forumThreads.id, result.id));
    await db.delete(users).where(eq(users.id, target.id)); // cascades the notification
  });
});
