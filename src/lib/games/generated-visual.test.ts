import { describe, expect, it } from "vitest";
import { generatedVisual } from "./generated-visual";
import { normalizeGame } from "./normalize-game";

describe("normalizeGame", () => {
  it("lowercases and trims", () => {
    expect(normalizeGame("  D&D 5e  ")).toBe("d&d 5e");
    expect(normalizeGame("VALORANT")).toBe("valorant");
  });

  it("treats case/whitespace variants as the same key", () => {
    expect(normalizeGame("D&D 5e")).toBe(normalizeGame(" d&d 5e "));
  });
});

describe("generatedVisual", () => {
  it("is deterministic -- same name, same visual every time (FR-002)", () => {
    const a = generatedVisual("Valorant");
    const b = generatedVisual("Valorant");
    expect(a).toEqual(b);
  });

  it("ignores case/whitespace, matching the normalisation used for lookup", () => {
    expect(generatedVisual("Valorant").background).toBe(generatedVisual("  valorant ").background);
  });

  it("is visibly distinct for different names -- no more identical orange", () => {
    const names = ["Valorant", "D&D 5e", "Helldivers 2", "Catan", "CS2", "Elden Ring"];
    const backgrounds = names.map((n) => generatedVisual(n).background);
    // All different from each other...
    expect(new Set(backgrounds).size).toBe(names.length);
    // ...and none is the old flat accent block.
    for (const bg of backgrounds) {
      expect(bg).toContain("linear-gradient");
      expect(bg).not.toContain("var(--color-accent)");
    }
  });

  it("derives sensible initials", () => {
    expect(generatedVisual("Valorant").initials).toBe("VA");
    expect(generatedVisual("Helldivers 2").initials).toBe("H2");
    expect(generatedVisual("D&D 5e").initials).toBe("D5"); // "D&D"->D, "5e"->5
  });

  it("never crashes on odd names", () => {
    expect(generatedVisual("").initials).toBe("?");
    expect(generatedVisual("   ").initials).toBe("?");
    expect(generatedVisual("!!!").initials).toBe("?");
    expect(() => generatedVisual("🎮 online")).not.toThrow();
  });
});
