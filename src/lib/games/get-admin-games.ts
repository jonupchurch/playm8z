import { asc } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games } from "@/db/schema";

export interface AdminGameAlias {
  id: string;
  alias: string;
}

export interface AdminGame {
  id: string;
  name: string;
  imageUrl: string | null;
  disabled: boolean;
  aliases: AdminGameAlias[];
}

/**
 * Every game (enabled and disabled) with its aliases, for the admin Games
 * screen. Small/bounded (a curated list, not Browse's scale), so fetch it
 * all and let the client filter -- same shape as the News admin list.
 */
export async function getAdminGames(): Promise<AdminGame[]> {
  const [gameRows, aliasRows] = await Promise.all([
    db
      .select({ id: games.id, name: games.name, imageUrl: games.imageUrl, disabledAt: games.disabledAt })
      .from(games)
      .orderBy(asc(games.name)),
    db
      .select({ id: gameAliases.id, gameId: gameAliases.gameId, alias: gameAliases.normalizedAlias })
      .from(gameAliases)
      .orderBy(asc(gameAliases.normalizedAlias)),
  ]);

  const aliasesByGame = new Map<string, AdminGameAlias[]>();
  for (const row of aliasRows) {
    const list = aliasesByGame.get(row.gameId) ?? [];
    list.push({ id: row.id, alias: row.alias });
    aliasesByGame.set(row.gameId, list);
  }

  return gameRows.map((g) => ({
    id: g.id,
    name: g.name,
    imageUrl: g.imageUrl,
    disabled: g.disabledAt !== null,
    aliases: aliasesByGame.get(g.id) ?? [],
  }));
}
