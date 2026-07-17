import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games } from "@/db/schema";
import type { GameEntry } from "@/lib/games/match-game-name";

/**
 * The curated, ENABLED games and their aliases (036), for Post a Game's
 * typeahead + "did you mean?". Small bounded read, fetched once when the
 * form loads and passed down as a prop — never per-keystroke (FR-006). A
 * disabled game (035's soft-delete) is excluded, so it stops being suggested.
 *
 * Returns display names (canonical) plus each game's normalised aliases,
 * shaped exactly as the matcher's GameEntry.
 */
export async function getRatifiedGames(): Promise<GameEntry[]> {
  const [gameRows, aliasRows] = await Promise.all([
    db
      .select({ id: games.id, name: games.name })
      .from(games)
      .where(isNull(games.disabledAt))
      .orderBy(asc(games.name)),
    db.select({ gameId: gameAliases.gameId, alias: gameAliases.normalizedAlias }).from(gameAliases),
  ]);

  const aliasesByGame = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = aliasesByGame.get(row.gameId) ?? [];
    list.push(row.alias);
    aliasesByGame.set(row.gameId, list);
  }

  return gameRows.map((g) => ({ canonical: g.name, aliases: aliasesByGame.get(g.id) ?? [] }));
}
