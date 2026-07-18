import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { normalizeGame } from "./normalize-game";

// Dedup a list of game names by normalizeGame, dropping blanks, keeping the
// first occurrence's display name.
export function dedupeGameNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = normalizeGame(name);
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

export type BackfillReport = { seeded: number; skippedCurated: number; empty: number };

// One-time recovery (042, ADR 0015): seed `userGames` from the deprecated
// `users.gamesPlayed` snapshot ONLY for players who have NO userGames rows.
// userGames always wins: a player with any curated game is skipped entirely, so
// this never resurrects a removed game or overwrites a curated list. Idempotent
// (seeded players then have userGames rows, so a re-run skips them). `userIds`
// scopes the run (used by tests); omit to run over every user (the script).
export async function backfillUserGames(userIds?: string[]): Promise<BackfillReport> {
  const all = userIds
    ? await db.select({ id: users.id, gamesPlayed: users.gamesPlayed }).from(users).where(inArray(users.id, userIds))
    : await db.select({ id: users.id, gamesPlayed: users.gamesPlayed }).from(users);

  const report: BackfillReport = { seeded: 0, skippedCurated: 0, empty: 0 };

  for (const u of all) {
    const [existing] = await db.select({ id: userGames.id }).from(userGames).where(eq(userGames.userId, u.id)).limit(1);
    if (existing) {
      report.skippedCurated += 1; // has curated games -> never touched
      continue;
    }
    const names = dedupeGameNames(u.gamesPlayed ?? []);
    if (names.length === 0) {
      report.empty += 1;
      continue;
    }
    await db.insert(userGames).values(names.map((game) => ({ userId: u.id, game })));
    report.seeded += 1;
  }

  return report;
}
