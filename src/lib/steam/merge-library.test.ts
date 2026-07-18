import { describe, expect, it } from "vitest";
import { mergeLibrary } from "./merge-library";

describe("mergeLibrary", () => {
  it("sorts by playtime desc, pre-marks recent, flags already-on-profile, rounds hours", () => {
    const result = mergeLibrary(
      [
        { appid: 1, name: "Alpha", playtimeMinutes: 120 },
        { appid: 2, name: "Bravo", playtimeMinutes: 6000 },
        { appid: 3, name: "Charlie", playtimeMinutes: 20 },
      ],
      new Set([2]),
      ["alpha"], // already on the profile, case/space-insensitive
    );

    expect(result.map((r) => r.name)).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(result.find((r) => r.name === "Bravo")!.recentlyPlayed).toBe(true);
    expect(result.find((r) => r.name === "Alpha")!.recentlyPlayed).toBe(false);
    expect(result.find((r) => r.name === "Alpha")!.alreadyOnProfile).toBe(true);
    expect(result.find((r) => r.name === "Bravo")!.alreadyOnProfile).toBe(false);
    expect(result.find((r) => r.name === "Bravo")!.hoursPlayed).toBe(100);
    expect(result.find((r) => r.name === "Charlie")!.hoursPlayed).toBe(0);
  });

  it("returns an empty list for an empty library", () => {
    expect(mergeLibrary([], new Set(), [])).toEqual([]);
  });
});
