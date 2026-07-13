import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, threadSubscriptions, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleSubscription } = await import("./toggle-subscription");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `sub-verified-${runId}@example.com`;
const unverifiedEmail = `sub-unverified-${runId}@example.com`;

let userId: string;
let threadId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `subverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = user.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `subunverified${runId}` });

  const [thread] = await db
    .insert(forumThreads)
    .values({ authorId: userId, categoryId: "general", title: `Thread ${runId}`, body: "body" })
    .returning({ id: forumThreads.id });
  threadId = thread.id;
});

afterAll(async () => {
  await db.delete(threadSubscriptions).where(eq(threadSubscriptions.userId, userId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("toggleSubscription", () => {
  it("subscribes then unsubscribes, toggling the row's existence", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const first = await toggleSubscription({ threadId });
    expect(first).toEqual({ success: true, subscribed: true });

    const [row] = await db
      .select()
      .from(threadSubscriptions)
      .where(and(eq(threadSubscriptions.userId, userId), eq(threadSubscriptions.threadId, threadId)));
    expect(row).toBeDefined();

    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const second = await toggleSubscription({ threadId });
    expect(second).toEqual({ success: true, subscribed: false });

    const rows = await db
      .select()
      .from(threadSubscriptions)
      .where(and(eq(threadSubscriptions.userId, userId), eq(threadSubscriptions.threadId, threadId)));
    expect(rows).toHaveLength(0);
  });

  it("the database's own unique constraint rejects a duplicate subscription row", async () => {
    await db.insert(threadSubscriptions).values({ userId, threadId });
    await expect(db.insert(threadSubscriptions).values({ userId, threadId })).rejects.toThrow();
    await db.delete(threadSubscriptions).where(and(eq(threadSubscriptions.userId, userId), eq(threadSubscriptions.threadId, threadId)));
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleSubscription({ threadId });
    expect(result.success).toBe(false);
  });
});
