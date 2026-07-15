import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { saveNewsPost } = await import("./save-news-post");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const postIds: string[] = [];

const base = {
  title: `Test post ${runId}`,
  excerpt: "An excerpt",
  body: "Body text",
  category: "Announcement" as const,
  cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
  featured: false,
};

afterAll(async () => {
  for (const id of postIds) await db.delete(newsPosts).where(eq(newsPosts.id, id));
});

describe("saveNewsPost", () => {
  it("rejects when the role check fails (today's real behavior)", async () => {
    mockedRequireRole.mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });
    await expect(saveNewsPost({ ...base, action: "save-draft" })).rejects.toThrow();
  });

  it("publish (new post): sets status=published and publishedAt=now", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const before = Date.now();
    const result = await saveNewsPost({ ...base, action: "publish" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    postIds.push(result.id);

    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, result.id));
    expect(row.status).toBe("published");
    expect(row.publishedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("schedule: sets status=scheduled and publishedAt to the entered future date", async () => {
    const future = new Date(Date.now() + 7 * 86_400_000);
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, action: "schedule", publishDate: future });
    expect(result.success).toBe(true);
    if (!result.success) return;
    postIds.push(result.id);

    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, result.id));
    expect(row.status).toBe("scheduled");
    expect(row.publishedAt.getTime()).toBe(future.getTime());
  });

  it("save-draft always overrides to draft, even for an already-published post", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const created = await saveNewsPost({ ...base, action: "publish" });
    if (!created.success) throw new Error("setup failed");
    postIds.push(created.id);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, postId: created.id, action: "save-draft" });
    expect(result.success).toBe(true);

    const [row] = await db.select({ status: newsPosts.status }).from(newsPosts).where(eq(newsPosts.id, created.id));
    expect(row.status).toBe("draft");
  });

  it("updating an already-published post via publish preserves its original publishedAt", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const created = await saveNewsPost({ ...base, action: "publish" });
    if (!created.success) throw new Error("setup failed");
    postIds.push(created.id);

    const [beforeRow] = await db.select({ publishedAt: newsPosts.publishedAt }).from(newsPosts).where(eq(newsPosts.id, created.id));

    await new Promise((resolve) => setTimeout(resolve, 10));
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, postId: created.id, title: "Updated title", action: "publish" });
    expect(result.success).toBe(true);

    const [afterRow] = await db.select().from(newsPosts).where(eq(newsPosts.id, created.id));
    expect(afterRow.status).toBe("published");
    expect(afterRow.publishedAt.getTime()).toBe(beforeRow.publishedAt.getTime());
    expect(afterRow.title).toBe("Updated title");
  });

  it("pin exclusivity: featuring one post clears it on whichever post previously had it", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const first = await saveNewsPost({ ...base, action: "publish", featured: true });
    if (!first.success) throw new Error("setup failed");
    postIds.push(first.id);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const second = await saveNewsPost({ ...base, action: "publish", featured: true });
    if (!second.success) throw new Error("setup failed");
    postIds.push(second.id);

    const [firstRow] = await db.select({ featured: newsPosts.featured }).from(newsPosts).where(eq(newsPosts.id, first.id));
    const [secondRow] = await db.select({ featured: newsPosts.featured }).from(newsPosts).where(eq(newsPosts.id, second.id));
    expect(firstRow.featured).toBe(false);
    expect(secondRow.featured).toBe(true);
  });

  it("delete sets status=draft without removing the row, and rejects deleting an unsaved post", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const created = await saveNewsPost({ ...base, action: "publish" });
    if (!created.success) throw new Error("setup failed");
    postIds.push(created.id);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, postId: created.id, action: "delete" });
    expect(result).toEqual({ success: true, id: created.id });

    const [row] = await db.select().from(newsPosts).where(eq(newsPosts.id, created.id));
    expect(row.status).toBe("draft");
    expect(row.title).toBe(base.title); // row still exists, untouched title

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const rejected = await saveNewsPost({ ...base, action: "delete" });
    expect(rejected).toEqual({ success: false, error: "Cannot delete a post that hasn't been saved yet." });
  });

  it("returns an error for a nonexistent postId", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, postId: crypto.randomUUID(), action: "save-draft" });
    expect(result).toEqual({ success: false, error: "Post not found." });
  });
});
