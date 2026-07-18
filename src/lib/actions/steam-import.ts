"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { normalizeGame } from "@/lib/games/normalize-game";
import { getOwnedGames, getRecentlyPlayedAppIds } from "@/lib/steam/steam-client";
import { mergeLibrary, type ReviewItem } from "@/lib/steam/merge-library";
import { importSelectionSchema } from "@/lib/validations/steam";

export type ReviewResult =
  | { kind: "list"; items: ReviewItem[] }
  | { kind: "private" }
  | { kind: "empty" }
  | { kind: "not-connected" }
  | { kind: "steam-unavailable" };

// FR-004/FR-007: read the connected player's Steam library for the review
// screen. Distinguishes private (can't see it) from empty (public, no games),
// and a Steam outage from either -- each gets its own message, none an error.
export async function readSteamLibrary(): Promise<ReviewResult> {
  const user = await requireAuth();
  const [row] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.id, user.id));
  if (!row?.steamId) return { kind: "not-connected" };

  let owned: Awaited<ReturnType<typeof getOwnedGames>>;
  let recent: Set<number>;
  try {
    [owned, recent] = await Promise.all([getOwnedGames(row.steamId), getRecentlyPlayedAppIds(row.steamId)]);
  } catch {
    return { kind: "steam-unavailable" };
  }

  if (owned === null) return { kind: "private" };
  if (owned.length === 0) return { kind: "empty" };

  const existing = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, user.id));
  return { kind: "list", items: mergeLibrary(owned, recent, existing.map((e) => e.game)) };
}

export type ImportResult = { success: true; added: number } | { success: false; error: string };

// FR-005/FR-009: add the chosen games, AUGMENTING (never replacing) the
// player's existing games and de-duplicating by normalized name -- both
// against what's already on the profile AND within the selection. The
// already-present set is re-derived server-side (the client's alreadyOnProfile
// is a UX hint, not trusted). Idempotent by construction.
export async function importSteamGames(selected: unknown): Promise<ImportResult> {
  const user = await requireAuth();
  const [row] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.id, user.id));
  if (!row?.steamId) return { success: false, error: "Connect Steam first." };

  const parsed = importSelectionSchema.safeParse(selected);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid selection." };
  }

  const existingRows = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, user.id));
  const seen = new Set(existingRows.map((r) => normalizeGame(r.game)).filter(Boolean));

  const toAdd: { userId: string; game: string; hoursPlayed: number }[] = [];
  for (const g of parsed.data) {
    const key = normalizeGame(g.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    toAdd.push({ userId: user.id, game: g.name.trim(), hoursPlayed: g.hoursPlayed });
  }

  if (toAdd.length > 0) await db.insert(userGames).values(toAdd);
  revalidatePath("/profile");
  return { success: true, added: toAdd.length };
}
