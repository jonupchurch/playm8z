import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, newsPosts, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleNewsLike } = await import("./toggle-news-like");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `news-like-verified-${runId}@example.com`;
const unverifiedEmail = `news-like-unverified-${runId}@example.com`;

let userId: string;
let newsPostId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `newslikeverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = user.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `newslikeunverified${runId}` });

  const [post] = await db
    .insert(newsPosts)
    .values({ title: `Like test ${runId}`, excerpt: "e", category: "Announcement", status: "published", slug: `tnl-${runId}` })
    .returning({ id: newsPosts.id });
  newsPostId = post.id;
});

afterAll(async () => {
  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.targetType, "newsPost")));
  await db.delete(newsPosts).where(eq(newsPosts.id, newsPostId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("toggleNewsLike", () => {
  it("likes the article, creating a likes row with targetType='newsPost'", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleNewsLike({ newsPostId });
    expect(result).toEqual({ success: true, liked: true });

    const [row] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.targetType, "newsPost"), eq(likes.targetId, newsPostId)));
    expect(row).toBeDefined();
  });

  it("unlikes the article, deleting the row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleNewsLike({ newsPostId });
    expect(result).toEqual({ success: true, liked: false });

    const rows = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.targetType, "newsPost"), eq(likes.targetId, newsPostId)));
    expect(rows).toEqual([]);
  });

  it("the database's own unique constraint rejects a duplicate like row", async () => {
    await db.insert(likes).values({ userId, targetType: "newsPost", targetId: newsPostId });
    await expect(db.insert(likes).values({ userId, targetType: "newsPost", targetId: newsPostId })).rejects.toThrow();
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.targetId, newsPostId)));
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleNewsLike({ newsPostId });
    expect(result.success).toBe(false);
  });

  it("blocks an unauthenticated visitor", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await toggleNewsLike({ newsPostId });
    expect(result.success).toBe(false);
  });
});
