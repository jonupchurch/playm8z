import { describe, expect, it } from "vitest";
import { createThreadSchema, forumSearchParamsSchema } from "./forum";

describe("forumSearchParamsSchema", () => {
  it("defaults to all/latest with an empty query", () => {
    const result = forumSearchParamsSchema.parse({});
    expect(result).toEqual({ category: "all", q: "", sort: "latest" });
  });

  it("accepts a valid category, query, and sort", () => {
    const result = forumSearchParamsSchema.parse({ category: "lfg", q: "valorant", sort: "top" });
    expect(result).toEqual({ category: "lfg", q: "valorant", sort: "top" });
  });

  it("falls back to defaults for an invalid category/sort rather than throwing", () => {
    const result = forumSearchParamsSchema.parse({ category: "bogus", sort: "bogus" });
    expect(result.category).toBe("all");
    expect(result.sort).toBe("latest");
  });

  it("trims and caps the search query", () => {
    const result = forumSearchParamsSchema.parse({ q: `  ${"a".repeat(250)}  ` });
    expect(result.q).toBe("");
  });
});

describe("createThreadSchema", () => {
  it("accepts a minimal valid thread with no tags", () => {
    const result = createThreadSchema.parse({ categoryId: "general", title: "Hello", body: "World" });
    expect(result.tags).toEqual([]);
  });

  it("comma-splits a tags string into a trimmed array", () => {
    const result = createThreadSchema.parse({
      categoryId: "gametalk",
      title: "Title",
      body: "Body",
      tags: " valorant, meta ,  ",
    });
    expect(result.tags).toEqual(["valorant", "meta"]);
  });

  it("rejects an invalid category", () => {
    expect(() => createThreadSchema.parse({ categoryId: "bogus", title: "Title", body: "Body" })).toThrow();
  });

  it("rejects an empty title or body", () => {
    expect(() => createThreadSchema.parse({ categoryId: "general", title: "", body: "Body" })).toThrow();
    expect(() => createThreadSchema.parse({ categoryId: "general", title: "Title", body: "" })).toThrow();
  });

  it("caps tags at 6", () => {
    const result = createThreadSchema.parse({
      categoryId: "general",
      title: "Title",
      body: "Body",
      tags: "a,b,c,d,e,f,g,h",
    });
    expect(result.tags).toHaveLength(6);
  });
});
