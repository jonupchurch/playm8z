import { describe, expect, it } from "vitest";
import { newsCategoryColor, newsFiltersSchema } from "./news";

describe("newsFiltersSchema", () => {
  it("defaults category to 'all', q to '', page to 1", () => {
    const result = newsFiltersSchema.parse({});
    expect(result).toEqual({ category: "all", q: "", page: 1 });
  });

  it("accepts a valid category", () => {
    expect(newsFiltersSchema.parse({ category: "Event" }).category).toBe("Event");
  });

  it("falls back to 'all' for a garbage category rather than throwing", () => {
    expect(newsFiltersSchema.parse({ category: "nonsense" }).category).toBe("all");
  });

  it("coerces a numeric-string page", () => {
    expect(newsFiltersSchema.parse({ page: "3" }).page).toBe(3);
  });

  it("falls back to page 1 for a garbage page value rather than throwing", () => {
    expect(newsFiltersSchema.parse({ page: "not-a-number" }).page).toBe(1);
    expect(newsFiltersSchema.parse({ page: "0" }).page).toBe(1);
    expect(newsFiltersSchema.parse({ page: "-5" }).page).toBe(1);
  });

  it("accepts a search query", () => {
    expect(newsFiltersSchema.parse({ q: "beta" }).q).toBe("beta");
  });

  it("falls back to an empty q for an over-long search value rather than throwing", () => {
    // A tampered/oversized ?q= must degrade like every other field here,
    // not throw an uncaught ZodError that crashes the page render.
    expect(newsFiltersSchema.parse({ q: "x".repeat(201) }).q).toBe("");
  });
});

describe("newsCategoryColor", () => {
  it("returns a color for each documented category", () => {
    for (const category of ["Announcement", "Update", "Event", "Community", "Patch Notes"]) {
      expect(newsCategoryColor(category)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("falls back to a default color for an unknown category", () => {
    expect(newsCategoryColor("unknown")).toBe("#ffb000");
  });
});
