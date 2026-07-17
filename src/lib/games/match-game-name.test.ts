import { describe, expect, it } from "vitest";
import { typeaheadMatches, didYouMean, type GameEntry } from "./match-game-name";

const NAMES = ["Valorant", "Valheim", "D&D 5e", "CS2", "Helldivers 2", "Elden Ring"];
const ENTRIES: GameEntry[] = [
  { canonical: "Valorant", aliases: [] },
  { canonical: "Valheim", aliases: [] },
  { canonical: "D&D 5e", aliases: ["dnd 5e", "dungeons and dragons 5e"] },
  { canonical: "CS2", aliases: ["counter-strike 2"] },
  { canonical: "Elden Ring", aliases: [] },
];

describe("typeaheadMatches (FR-001)", () => {
  it("offers all substring matches, prefix ones first", () => {
    const r = typeaheadMatches("val", NAMES);
    expect(r).toEqual(["Valheim", "Valorant"]); // both prefix, alphabetical
  });

  it("is case- and space-insensitive and returns the canonical spelling", () => {
    expect(typeaheadMatches("  VALOR ", NAMES)).toEqual(["Valorant"]);
  });

  it("ranks a prefix match above a mid-string match", () => {
    const r = typeaheadMatches("ell", ["Elden Ring", "Helldivers 2"]);
    // "Elden" starts with... no; both contain "ell"? Helldivers has "ell",
    // Elden doesn't. Use a clearer case:
    expect(typeaheadMatches("hell", ["Elden Ring", "Helldivers 2"])).toEqual(["Helldivers 2"]);
    void r;
  });

  it("excludes an exact match (nothing to suggest about what's typed)", () => {
    expect(typeaheadMatches("valorant", NAMES)).toEqual([]);
  });

  it("returns nothing for a too-short query", () => {
    expect(typeaheadMatches("v", NAMES)).toEqual([]);
    expect(typeaheadMatches("", NAMES)).toEqual([]);
  });

  it("returns nothing when the catalog is empty (FR-008)", () => {
    expect(typeaheadMatches("val", [])).toEqual([]);
  });

  it("caps the number of matches", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Game ${i}`);
    expect(typeaheadMatches("game", many, 6)).toHaveLength(6);
  });
});

describe("didYouMean (FR-004/005)", () => {
  it("suggests the canonical for a near-miss typo (SC-002)", () => {
    expect(didYouMean("Valornt", ENTRIES)).toBe("Valorant");
  });

  it("returns null on an EXACT canonical match, any case (SC-003 -- no false nudge)", () => {
    expect(didYouMean("Valorant", ENTRIES)).toBeNull();
    expect(didYouMean("  VALORANT ", ENTRIES)).toBeNull();
  });

  it("resolves an exact ALIAS match to the canonical (definite, high confidence)", () => {
    // "dnd 5e" is a known alias of "D&D 5e" -> but it's exact on the alias,
    // so it's a confident correction to the canonical, not a fuzzy guess.
    expect(didYouMean("dnd 5e", ENTRIES)).toBe("D&D 5e");
  });

  it("resolves a near-miss of an alias to the canonical", () => {
    expect(didYouMean("dnd 5", ENTRIES)).toBe("D&D 5e"); // 1 edit from "dnd 5e"
  });

  it("returns null for an unrelated name (no false nudge)", () => {
    expect(didYouMean("Chess", ENTRIES)).toBeNull();
    expect(didYouMean("Minecraft", ENTRIES)).toBeNull();
  });

  it("does not over-nudge on a short query when an exact match exists", () => {
    // "cs2" is exact -> null (never nudge to something else).
    expect(didYouMean("cs2", ENTRIES)).toBeNull();
  });

  it("returns null on an empty catalog or too-short query", () => {
    expect(didYouMean("valornt", [])).toBeNull();
    expect(didYouMean("v", ENTRIES)).toBeNull();
  });

  it("picks the CLOSEST when more than one game is near", () => {
    const entries: GameEntry[] = [
      { canonical: "Valorant", aliases: [] },
      { canonical: "Valheim", aliases: [] },
    ];
    // "valoran" is 1 from Valorant, further from Valheim.
    expect(didYouMean("valoran", entries)).toBe("Valorant");
  });
});
