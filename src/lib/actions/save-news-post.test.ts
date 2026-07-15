import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, newsPosts, users } from "@/db/schema";

// requireRole is mocked directly (its rank check is hardcoded to
// reject every real session until Admin Settings/024's role column --
// pre-existing convention). `@/auth` is separately mocked so
// requireAuth() (used to attribute the new logAuditEntry() call,
// 025's own gap fix, to a real moderator row) succeeds.
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { requireRole } = await import("@/lib/auth/require-role");
const { auth } = await import("@/auth");
const { saveNewsPost } = await import("./save-news-post");
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `save-news-post-mod-${runId}@example.com`;
let moderatorId: string;
const postIds: string[] = [];

const base = {
  title: `Test post ${runId}`,
  excerpt: "An excerpt",
  body: "Body text",
  category: "Announcement" as const,
  cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
  featured: false,
};

beforeAll(async () => {
  const [moderator] = await db
    .insert(users)
    .values({ email: moderatorEmail, handle: `savenewspostmod${runId}` })
    .returning({ id: users.id });
  moderatorId = moderator.id;
  mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
});

afterAll(async () => {
  for (const id of postIds) await db.delete(newsPosts).where(eq(newsPosts.id, id));
  await db.delete(auditEntries).where(eq(auditEntries.actorId, moderatorId));
  await db.delete(users).where(eq(users.id, moderatorId));
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

    // FR-007 (025's own gap fix, research.md #2): a first-time publish logs.
    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, result.id), eq(auditEntries.action, "published a news post")));
    expect(entry.actorId).toBe(moderatorId);
    expect(entry.category).toBe("content");
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

    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, result.id), eq(auditEntries.action, "scheduled a news post")));
    expect(entry.actorId).toBe(moderatorId);
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

    // FR-007: an edit to an already-published post logs as "updated," not
    // a second "published" entry.
    const [entry] = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetId, created.id), eq(auditEntries.action, "updated a news post")));
    expect(entry.actorId).toBe(moderatorId);
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

  // News Article detail (023)/research.md #2: a human-legible, unique
  // slug generated once, at creation only.
  it("generates a slug from the title at creation, appending a numeric suffix on collision, and never regenerates it on edit", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const slugTitle = `Slug Collision Test ${runId}`;
    const first = await saveNewsPost({ ...base, title: slugTitle, action: "save-draft" });
    expect(first.success).toBe(true);
    if (!first.success) return;
    postIds.push(first.id);

    const [firstRow] = await db.select({ slug: newsPosts.slug }).from(newsPosts).where(eq(newsPosts.id, first.id));
    const expectedBase = `slug-collision-test-${runId}`.toLowerCase();
    expect(firstRow.slug).toBe(expectedBase);

    mockedRequireRole.mockResolvedValueOnce(undefined);
    const second = await saveNewsPost({ ...base, title: slugTitle, action: "save-draft" });
    expect(second.success).toBe(true);
    if (!second.success) return;
    postIds.push(second.id);

    const [secondRow] = await db.select({ slug: newsPosts.slug }).from(newsPosts).where(eq(newsPosts.id, second.id));
    expect(secondRow.slug).toBe(`${expectedBase}-2`);

    // Editing the title afterward never changes the already-generated slug.
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const edited = await saveNewsPost({ ...base, postId: first.id, title: "A completely different title", action: "save-draft" });
    expect(edited.success).toBe(true);

    const [afterEdit] = await db.select({ slug: newsPosts.slug, title: newsPosts.title }).from(newsPosts).where(eq(newsPosts.id, first.id));
    expect(afterEdit.slug).toBe(expectedBase);
    expect(afterEdit.title).toBe("A completely different title");
  });

  it("persists tags from a comma-separated string", async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined);
    const result = await saveNewsPost({ ...base, tags: "launch, beta ,  product", action: "save-draft" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    postIds.push(result.id);

    const [row] = await db.select({ tags: newsPosts.tags }).from(newsPosts).where(eq(newsPosts.id, result.id));
    expect(row.tags).toEqual(["launch", "beta", "product"]);
  });
});
