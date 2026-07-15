import { describe, expect, it } from "vitest";
import { newsPostFilterSchema, newsPostIdParamSchema, saveNewsPostSchema } from "./admin-news";

const baseInput = {
  title: "A headline",
  excerpt: "An excerpt",
  body: "Body text",
  category: "Announcement" as const,
  cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
  featured: false,
};

describe("newsPostFilterSchema", () => {
  it("accepts every valid filter", () => {
    for (const filter of ["all", "published", "draft", "scheduled"]) {
      expect(newsPostFilterSchema.parse(filter)).toBe(filter);
    }
  });
});

describe("saveNewsPostSchema", () => {
  it("accepts publish/save-draft/delete without a publish date", () => {
    for (const action of ["publish", "save-draft", "delete"] as const) {
      expect(saveNewsPostSchema.safeParse({ ...baseInput, action }).success).toBe(true);
    }
  });

  it("requires a future publish date when action is schedule", () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, action: "schedule", publishDate: future }).success).toBe(true);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, action: "schedule" }).success).toBe(false);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, action: "schedule", publishDate: past }).success).toBe(false);
  });

  it("rejects an empty title/excerpt, a title over 120 chars, or an invalid category", () => {
    expect(saveNewsPostSchema.safeParse({ ...baseInput, title: "", action: "save-draft" }).success).toBe(false);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, excerpt: "", action: "save-draft" }).success).toBe(false);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, title: "a".repeat(121), action: "save-draft" }).success).toBe(false);
    expect(saveNewsPostSchema.safeParse({ ...baseInput, category: "Bogus", action: "save-draft" }).success).toBe(false);
  });

  it("accepts an optional postId for updates and defaults featured to false", () => {
    const id = crypto.randomUUID();
    const result = saveNewsPostSchema.safeParse({ ...baseInput, postId: id, action: "save-draft", featured: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.featured).toBe(false);
  });
});

describe("newsPostIdParamSchema", () => {
  it("falls back to undefined for missing/invalid values, never throwing", () => {
    expect(newsPostIdParamSchema.parse(undefined)).toBeUndefined();
    expect(newsPostIdParamSchema.parse("not-a-uuid")).toBeUndefined();
    const id = crypto.randomUUID();
    expect(newsPostIdParamSchema.parse(id)).toBe(id);
  });
});
