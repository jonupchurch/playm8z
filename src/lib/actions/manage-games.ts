"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
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

  await db.insert(userGames).values({ userId: user.id, ...parsed.data });

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
