"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { normalizeGame } from "@/lib/games/normalize-game";
import { userGameSchema } from "@/lib/validations/profile";

export type ManageGamesResult = { success: true } | { success: false; error: string };

// FR-003: add/remove a UserGame row -- richer than onboarding's flat
// gamesPlayed list (game + optional self-reported rank/hours).
export async function addUserGame(input: {
  game: string;
  rank?: string;
  hoursPlayed?: number;
}): Promise<ManageGamesResult> {
  const user = await requireAuth();

  const parsed = userGameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // 043 (ADR 0016): userGames is unique per player on the normalized game name.
  // Two layers keep that clean. App-side: if the player already has this
  // (normalized) game, no-op with a benign success ("already in your list") so
  // the common case never depends on catching a DB error. DB backstop:
  // onConflictDoNothing swallows the unique-index violation from a concurrent
  // double-submit, so the constraint never surfaces as a raw error.
  const target = normalizeGame(parsed.data.game);
  const existing = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, user.id));
  if (existing.some((row) => normalizeGame(row.game) === target)) {
    return { success: true };
  }

  await db.insert(userGames).values({ userId: user.id, ...parsed.data }).onConflictDoNothing();

  return { success: true };
}

// No soft-delete concern (ADR 0005) -- a user removing a game they no
// longer play is a real delete, same reasoning as SavedListing.
export async function removeUserGame(gameId: string): Promise<ManageGamesResult> {
  const user = await requireAuth();

  const result = await db
    .delete(userGames)
    .where(and(eq(userGames.id, gameId), eq(userGames.userId, user.id)))
    .returning({ id: userGames.id });

  if (result.length === 0) {
    return { success: false, error: "That game entry wasn't found." };
  }

  return { success: true };
}
