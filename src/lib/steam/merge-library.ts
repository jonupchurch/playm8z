import { normalizeGame } from "@/lib/games/normalize-game";

// Pure merge (038) — no I/O — turning a Steam library into the review list.
// Unit-testable without Steam or a DB.

export interface ReviewItem {
  name: string;
  hoursPlayed: number;
  recentlyPlayed: boolean;
  alreadyOnProfile: boolean;
}

/**
 * Build the review list: owned games sorted by playtime (desc), each marked
 * whether it was recently played (for pre-select) and whether it's already on
 * the player's profile (compared by normalized name, so it can't be
 * double-added). Playtime minutes -> whole hours.
 */
export function mergeLibrary(
  owned: { name: string; playtimeMinutes: number; appid: number }[],
  recentAppIds: Set<number>,
  existingGameNames: string[],
): ReviewItem[] {
  const existing = new Set(existingGameNames.map(normalizeGame).filter(Boolean));
  return owned
    .map((g) => ({
      name: g.name,
      hoursPlayed: Math.round(g.playtimeMinutes / 60),
      recentlyPlayed: recentAppIds.has(g.appid),
      alreadyOnProfile: existing.has(normalizeGame(g.name)),
    }))
    .sort((a, b) => b.hoursPlayed - a.hoursPlayed || a.name.localeCompare(b.name));
}
