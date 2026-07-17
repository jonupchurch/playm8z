"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { normalizeGame } from "@/lib/games/normalize-game";

export type ManageGameResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The FR-015 cross-table check: is this normalised string already claimed by
 * a game's own name OR by any alias? A single-table unique index can't span
 * the two, so this is the application-level guard (the unique indexes are
 * the race backstop), following the handle-uniqueness precedent.
 *
 * `exceptGameId` excludes a game's own name when renaming it.
 */
async function isNameClaimed(normalized: string, exceptGameId?: string): Promise<boolean> {
  const [nameHit] = await db
    .select({ id: games.id })
    .from(games)
    .where(
      exceptGameId
        ? and(eq(games.normalizedName, normalized), ne(games.id, exceptGameId))
        : eq(games.normalizedName, normalized),
    )
    .limit(1);
  if (nameHit) return true;

  const [aliasHit] = await db
    .select({ id: gameAliases.id })
    .from(gameAliases)
    .where(eq(gameAliases.normalizedAlias, normalized))
    .limit(1);
  return Boolean(aliasHit);
}

function pgUniqueViolation(err: unknown): boolean {
  const code =
    err && typeof err === "object"
      ? ((err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code)
      : undefined;
  return code === "23505";
}

export async function createGame(name: string): Promise<ManageGameResult<{ id: string }>> {
  await requireRole("moderator");
  const actor = await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "A game needs a name." };
  if (trimmed.length > 100) return { success: false, error: "That name is too long." };

  const normalized = normalizeGame(trimmed);
  if (await isNameClaimed(normalized)) {
    return { success: false, error: "That game (or an alias of it) already exists." };
  }

  let id: string;
  try {
    const [row] = await db
      .insert(games)
      .values({ name: trimmed, normalizedName: normalized })
      .returning({ id: games.id });
    id = row.id;
  } catch (err) {
    if (pgUniqueViolation(err)) return { success: false, error: "That game already exists." };
    throw err;
  }

  await logAuditEntry({ actorId: actor.id, action: `added game "${trimmed}"`, category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true, data: { id } };
}

export async function renameGame(id: string, name: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "A game needs a name." };
  const normalized = normalizeGame(trimmed);
  if (await isNameClaimed(normalized, id)) {
    return { success: false, error: "That game (or an alias of it) already exists." };
  }

  try {
    await db.update(games).set({ name: trimmed, normalizedName: normalized }).where(eq(games.id, id));
  } catch (err) {
    if (pgUniqueViolation(err)) return { success: false, error: "That game already exists." };
    throw err;
  }

  await logAuditEntry({ actorId: actor.id, action: `renamed a game to "${trimmed}"`, category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true };
}

// ADR 0005: soft-disable, never hard-delete. A disabled game leaves image
// resolution (its name falls back to the generated visual); its postings,
// which never referenced it, are unaffected.
export async function disableGame(id: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();
  await db.update(games).set({ disabledAt: new Date() }).where(eq(games.id, id));
  await logAuditEntry({ actorId: actor.id, action: "disabled a game", category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true };
}

export async function enableGame(id: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();
  await db.update(games).set({ disabledAt: null }).where(eq(games.id, id));
  await logAuditEntry({ actorId: actor.id, action: "re-enabled a game", category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true };
}

export async function uploadGameImage(id: string, formData: FormData): Promise<ManageGameResult<{ url: string }>> {
  await requireRole("moderator");
  const actor = await requireAuth();

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided." };
  if (!ALLOWED_TYPES.includes(file.type)) return { success: false, error: "Please upload a JPEG, PNG, or WebP image." };
  if (file.size > MAX_BYTES) return { success: false, error: "Image must be smaller than 5MB." };

  const [before] = await db.select({ imageUrl: games.imageUrl }).from(games).where(eq(games.id, id));
  const blob = await put(`game-images/${file.name}`, file, { access: "public", addRandomSuffix: true });
  await db.update(games).set({ imageUrl: blob.url }).where(eq(games.id, id));
  await deletePriorBlob(before?.imageUrl);

  await logAuditEntry({ actorId: actor.id, action: "set a game's headline image", category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true, data: { url: blob.url } };
}

export async function removeGameImage(id: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();
  const [before] = await db.select({ imageUrl: games.imageUrl }).from(games).where(eq(games.id, id));
  await db.update(games).set({ imageUrl: null }).where(eq(games.id, id));
  await deletePriorBlob(before?.imageUrl);
  await logAuditEntry({ actorId: actor.id, action: "removed a game's headline image", category: "content", targetType: "game", targetId: id });
  revalidateGameSurfaces();
  return { success: true };
}

export async function addGameAlias(gameId: string, alias: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();

  const normalized = normalizeGame(alias);
  if (!normalized) return { success: false, error: "An alias needs text." };
  // FR-015: an alias must not equal any game's own name, nor any existing
  // alias. isNameClaimed covers both.
  if (await isNameClaimed(normalized)) {
    return { success: false, error: "That spelling is already a game name or another alias." };
  }

  try {
    await db.insert(gameAliases).values({ gameId, normalizedAlias: normalized });
  } catch (err) {
    if (pgUniqueViolation(err)) return { success: false, error: "That alias already exists." };
    throw err;
  }

  await logAuditEntry({ actorId: actor.id, action: `added alias "${normalized}"`, category: "content", targetType: "game", targetId: gameId });
  revalidateGameSurfaces();
  return { success: true };
}

export async function removeGameAlias(aliasId: string): Promise<ManageGameResult> {
  await requireRole("moderator");
  const actor = await requireAuth();
  await db.delete(gameAliases).where(eq(gameAliases.id, aliasId));
  await logAuditEntry({ actorId: actor.id, action: "removed a game alias", category: "content", targetType: "gameAlias", targetId: aliasId });
  revalidateGameSurfaces();
  return { success: true };
}

/** Exported so suggest-game-aliases' accept path enforces the same FR-015 rule. */
export { isNameClaimed as __isNameClaimed };

function revalidateGameSurfaces() {
  revalidatePath("/admin/games");
  revalidatePath("/", "layout"); // Trending row resolves images
}

async function deletePriorBlob(url: string | null | undefined) {
  if (!url) return;
  try {
    await del(url);
  } catch (err) {
    console.error(`[manage-game] Could not delete prior game image ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
