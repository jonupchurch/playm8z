import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games } from "@/db/schema";
import { normalizeGame } from "@/lib/games/normalize-game";
import { generatedVisual, type GeneratedVisual } from "@/lib/games/generated-visual";

export type ResolvedGameImage =
  | { kind: "admin"; url: string }
  | { kind: "generated"; visual: GeneratedVisual };

/**
 * Resolve one game name to an image (035/FR-001): the curated admin image if
 * the normalised name matches an enabled game or one of its aliases,
 * otherwise a deterministic generated visual. A plain, AI-free, deterministic
 * lookup -- nothing here touches the AI path (FR-004).
 *
 * For a surface showing several games (Trending shows up to 5), use
 * resolveGameImages() -- calling this in a `.map()` is an N+1.
 */
export async function resolveGameImage(name: string): Promise<ResolvedGameImage> {
  const map = await resolveGameImages([name]);
  return map.get(normalizeGame(name)) ?? { kind: "generated", visual: generatedVisual(name) };
}

/**
 * Batched resolver: one query for many names, returning a map keyed by the
 * NORMALISED name (so callers look up `map.get(normalizeGame(raw))`). Every
 * requested name is present in the result -- unmatched ones get a generated
 * visual -- so callers never have to handle a missing key.
 */
export async function resolveGameImages(
  names: string[],
): Promise<Map<string, ResolvedGameImage>> {
  const normalized = [...new Set(names.map(normalizeGame).filter(Boolean))];
  const result = new Map<string, ResolvedGameImage>();

  // Default every requested name to its generated visual first, then upgrade
  // the ones that match a curated image below. This guarantees total
  // coverage and keeps the generated fallback the floor (FR-001).
  for (const name of names) {
    const key = normalizeGame(name);
    if (key) result.set(key, { kind: "generated", visual: generatedVisual(name) });
  }
  if (normalized.length === 0) return result;

  // One round trip: enabled games whose own name matches, OR whose alias
  // matches. A disabled game (disabledAt set) is excluded, so its name falls
  // through to the generated visual (FR-013).
  const [nameMatches, aliasMatches] = await Promise.all([
    db
      .select({ normalizedName: games.normalizedName, imageUrl: games.imageUrl })
      .from(games)
      .where(and(inArray(games.normalizedName, normalized), isNull(games.disabledAt))),
    db
      .select({ alias: gameAliases.normalizedAlias, imageUrl: games.imageUrl })
      .from(gameAliases)
      .innerJoin(games, eq(gameAliases.gameId, games.id))
      .where(and(inArray(gameAliases.normalizedAlias, normalized), isNull(games.disabledAt))),
  ]);

  // A game with a row but no image stays on the generated visual ("has a
  // row" != "has an image"), so only upgrade when imageUrl is present.
  for (const row of nameMatches) {
    if (row.imageUrl) result.set(row.normalizedName, { kind: "admin", url: row.imageUrl });
  }
  // Name match wins over alias match if somehow both exist for one key
  // (shouldn't, given FR-015's cross-check) -- apply aliases only where a
  // name match didn't already set an admin image.
  for (const row of aliasMatches) {
    if (row.imageUrl && result.get(row.alias)?.kind !== "admin") {
      result.set(row.alias, { kind: "admin", url: row.imageUrl });
    }
  }

  return result;
}
