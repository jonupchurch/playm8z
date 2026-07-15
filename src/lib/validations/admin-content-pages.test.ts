import { describe, expect, it } from "vitest";
import { contentPageFilterSchema, deleteContentPageSchema, searchContentPagesSchema } from "./admin-content-pages";

describe("contentPageFilterSchema", () => {
  it("accepts every valid filter", () => {
    for (const filter of ["all", "published", "draft", "system"]) {
      expect(contentPageFilterSchema.parse(filter)).toBe(filter);
    }
  });
});

describe("searchContentPagesSchema", () => {
  it("defaults q to an empty string and filter to all", () => {
    const result = searchContentPagesSchema.parse({});
    expect(result).toEqual({ q: "", filter: "all" });
  });

  it("falls back to all for an invalid filter instead of throwing", () => {
    const result = searchContentPagesSchema.parse({ filter: "bogus" });
    expect(result.filter).toBe("all");
  });

  it("accepts a real query string", () => {
    const result = searchContentPagesSchema.parse({ q: "privacy", filter: "published" });
    expect(result).toEqual({ q: "privacy", filter: "published" });
  });
});

describe("deleteContentPageSchema", () => {
  it("requires a valid uuid pageId", () => {
    expect(deleteContentPageSchema.safeParse({ pageId: "not-a-uuid" }).success).toBe(false);
    expect(deleteContentPageSchema.safeParse({ pageId: crypto.randomUUID() }).success).toBe(true);
  });
});
