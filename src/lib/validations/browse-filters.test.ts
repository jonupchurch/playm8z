import { describe, expect, it } from "vitest";
import { browseFiltersSchema } from "./browse-filters";

describe("browseFiltersSchema", () => {
  it("applies every default when given an empty object", () => {
    const result = browseFiltersSchema.parse({});
    expect(result).toEqual({
      q: "",
      vibe: "any",
      games: [],
      genres: [],
      regions: [],
      timeSlots: [],
      ageGroup: "any",
      openSlots: "any",
      platform: "any",
      micRequired: false,
      sort: "recent",
    });
  });

  it("normalizes a single searchParams value to a one-element array", () => {
    const result = browseFiltersSchema.parse({ genres: "FPS", regions: "na-west" });
    expect(result.genres).toEqual(["FPS"]);
    expect(result.regions).toEqual(["na-west"]);
  });

  it("accepts multiple values as a real array", () => {
    const result = browseFiltersSchema.parse({ genres: ["FPS", "RPG"] });
    expect(result.genres).toEqual(["FPS", "RPG"]);
  });

  it("falls back to the default instead of throwing on an invalid enum value", () => {
    const result = browseFiltersSchema.parse({ vibe: "not-a-real-vibe", ageGroup: "13" });
    expect(result.vibe).toBe("any");
    // Rejects 13 even if hand-crafted into the URL -- ADR 0002, never a
    // platform minimum below 18.
    expect(result.ageGroup).toBe("any");
  });

  // 030 deliberately changed this. The genre list is admin-editable, so
  // membership can't be a z.enum() here -- the schema checks shape and
  // the Browse page intersects against the stored list.
  //
  // The old behaviour was worse than it looked: one unrecognised genre
  // failed the whole z.array(z.enum(...)) parse, .catch([]) fired, and
  // the ENTIRE genre filter was silently discarded -- so a stale
  // bookmark reading ?genres=FPS&genres=MOBA ignored FPS too. Now the
  // unknown value alone is dropped (FR-009) and FPS still applies.
  it("passes well-shaped genre strings through -- membership is applied by the page", () => {
    const result = browseFiltersSchema.parse({ genres: ["FPS", "MOBA"] });
    expect(result.genres).toEqual(["FPS", "MOBA"]);
  });

  it("still falls back to empty for a genre of the wrong shape, rather than throwing", () => {
    const result = browseFiltersSchema.parse({ genres: ["FPS", "x".repeat(51)] });
    expect(result.genres).toEqual([]);
  });

  it("caps the genre array", () => {
    const result = browseFiltersSchema.parse({ genres: Array.from({ length: 9 }, (_, i) => `g${i}`) });
    expect(result.genres).toEqual([]);
  });

  it("only treats the literal string 'true' as micRequired=true", () => {
    expect(browseFiltersSchema.parse({ micRequired: "true" }).micRequired).toBe(true);
    expect(browseFiltersSchema.parse({ micRequired: "false" }).micRequired).toBe(false);
    expect(browseFiltersSchema.parse({}).micRequired).toBe(false);
  });

  it("accepts a valid sort value", () => {
    expect(browseFiltersSchema.parse({ sort: "soon" }).sort).toBe("soon");
  });
});
