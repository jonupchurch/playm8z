import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, likes, newsPosts, savedNewsPosts, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { deleteNewsPostPermanently } = await import("./delete-news-post");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const ownerEmail = `owner-${runId}@example.com`;
const adminEmail = `admin-${runId}@example.com`;

let ownerId: string;
let adminId: string;

function session(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

async function seedPost(): Promise<string> {
  const [post] = await db
    .insert(newsPosts)
    .values({ title: `Doomed ${runId}`, excerpt: "x", category: "Patch Notes", slug: `doomed-${runId}-${crypto.randomUUID().slice(0, 6)}`, status: "published" })
    .returning({ id: newsPosts.id });
  // one polymorphic like (no FK) + one saved row (real FK) to prove both are cleaned up
  await db.insert(likes).values({ userId: adminId, targetType: "newsPost", targetId: post.id });
  await db.insert(savedNewsPosts).values({ userId: adminId, newsPostId: post.id });
  return post.id;
}

beforeEach(async () => {
  if (!ownerId) {
    const [owner] = await db
      .insert(users)
      .values({ email: ownerEmail, handle: `owner${runId}`, emailVerified: new Date(), role: "admin", isOwner: true })
      .returning({ id: users.id });
    ownerId = owner.id;
    const [admin] = await db
      .insert(users)
      .values({ email: adminEmail, handle: `admin${runId}`, emailVerified: new Date(), role: "admin", isOwner: false })
      .returning({ id: users.id });
    adminId = admin.id;
  }
});

afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.actorId, ownerId));
  await db.delete(newsPosts).where(eq(newsPosts.title, `Doomed ${runId}`));
  await db.delete(users).where(eq(users.id, ownerId));
  await db.delete(users).where(eq(users.id, adminId));
});

describe("deleteNewsPostPermanently", () => {
  it("owner permanently deletes the post, its likes and saves, and writes an audit entry", async () => {
    const postId = await seedPost();
    mockedAuth.mockResolvedValue(session(ownerEmail));

    const result = await deleteNewsPostPermanently({ postId });
    expect(result).toEqual({ success: true });

    expect(await db.select().from(newsPosts).where(eq(newsPosts.id, postId))).toHaveLength(0);
    expect(
      await db.select().from(likes).where(and(eq(likes.targetType, "newsPost"), eq(likes.targetId, postId))),
    ).toHaveLength(0);
    expect(await db.select().from(savedNewsPosts).where(eq(savedNewsPosts.newsPostId, postId))).toHaveLength(0);

    const audit = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, postId), eq(auditEntries.action, "permanently deleted a news post")));
    expect(audit).toHaveLength(1);
    expect(audit[0].targetLabel).toBe(`Doomed ${runId}`);
    expect(audit[0].actorId).toBe(ownerId);
  });

  it("refuses a non-owner admin and deletes nothing", async () => {
    const postId = await seedPost();
    mockedAuth.mockResolvedValue(session(adminEmail));

    const result = await deleteNewsPostPermanently({ postId });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/owner/i);

    expect(await db.select().from(newsPosts).where(eq(newsPosts.id, postId))).toHaveLength(1);
    const audit = await db.select().from(auditEntries).where(eq(auditEntries.targetId, postId));
    expect(audit).toHaveLength(0);
  });

  it("fails gracefully for a non-existent post", async () => {
    mockedAuth.mockResolvedValue(session(ownerEmail));
    const result = await deleteNewsPostPermanently({ postId: crypto.randomUUID() });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found/i);
  });

  it("rejects an invalid postId", async () => {
    mockedAuth.mockResolvedValue(session(ownerEmail));
    const result = await deleteNewsPostPermanently({ postId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
