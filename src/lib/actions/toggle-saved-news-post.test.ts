import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts, savedNewsPosts, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleSavedNewsPost } = await import("./toggle-saved-news-post");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `news-save-verified-${runId}@example.com`;
const unverifiedEmail = `news-save-unverified-${runId}@example.com`;

let userId: string;
let newsPostId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `newssaveverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = user.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `newssaveunverified${runId}` });

  const [post] = await db
    .insert(newsPosts)
    .values({ title: `Save test ${runId}`, excerpt: "e", category: "Announcement", status: "published", slug: `tsnp-${runId}` })
    .returning({ id: newsPosts.id });
  newsPostId = post.id;
});

afterAll(async () => {
  await db.delete(savedNewsPosts).where(eq(savedNewsPosts.userId, userId));
  await db.delete(newsPosts).where(eq(newsPosts.id, newsPostId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("toggleSavedNewsPost", () => {
  it("saves the article, creating a row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleSavedNewsPost({ newsPostId });
    expect(result).toEqual({ success: true, saved: true });

    const [row] = await db
      .select()
      .from(savedNewsPosts)
      .where(and(eq(savedNewsPosts.userId, userId), eq(savedNewsPosts.newsPostId, newsPostId)));
    expect(row).toBeDefined();
  });

  it("unsaves the article, deleting the row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleSavedNewsPost({ newsPostId });
    expect(result).toEqual({ success: true, saved: false });

    const rows = await db
      .select()
      .from(savedNewsPosts)
      .where(and(eq(savedNewsPosts.userId, userId), eq(savedNewsPosts.newsPostId, newsPostId)));
    expect(rows).toEqual([]);
  });

  it("the database's own unique constraint rejects a duplicate save row", async () => {
    await db.insert(savedNewsPosts).values({ userId, newsPostId });
    await expect(db.insert(savedNewsPosts).values({ userId, newsPostId })).rejects.toThrow();
    await db.delete(savedNewsPosts).where(and(eq(savedNewsPosts.userId, userId), eq(savedNewsPosts.newsPostId, newsPostId)));
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleSavedNewsPost({ newsPostId });
    expect(result.success).toBe(false);
  });

  it("blocks an unauthenticated visitor", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await toggleSavedNewsPost({ newsPostId });
    expect(result.success).toBe(false);
  });
});
