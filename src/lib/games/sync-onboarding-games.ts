import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";
import { normalizeGame } from "@/lib/games/normalize-game";

// Reconciles ONE user's userGames rows to exactly `names` (042, ADR 0015):
// onboarding's game step calls this instead of writing the deprecated
// users.gamesPlayed. userGames has no unique constraint, so identity/dedup is by
// normalizeGame in application code (the same pattern steam-import.ts uses).
// Insert selected names not already present, delete rows whose normalized name is
// no longer selected. Scoped to userId -- never touches another user's rows.
export async function syncOnboardingGames(userId: string, names: string[]): Promise<void> {
  // Desired set, deduped by normalized name (first occurrence's display name wins).
  const desired = new Map<string, string>();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = normalizeGame(name);
    if (!desired.has(key)) desired.set(key, name);
  }

  const existing = await db
    .select({ id: userGames.id, game: userGames.game })
    .from(userGames)
    .where(eq(userGames.userId, userId));

  const existingKeys = new Set(existing.map((row) => normalizeGame(row.game)));

  const toInsert = [...desired.entries()]
    .filter(([key]) => !existingKeys.has(key))
    .map(([, name]) => ({ userId, game: name }));

  const toDeleteIds = existing.filter((row) => !desired.has(normalizeGame(row.game))).map((row) => row.id);

  if (toInsert.length > 0) {
    await db.insert(userGames).values(toInsert);
  }
  if (toDeleteIds.length > 0) {
    await db.delete(userGames).where(and(eq(userGames.userId, userId), inArray(userGames.id, toDeleteIds)));
  }
}
