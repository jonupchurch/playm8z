// Steam Web API reads (038) — server-only (uses STEAM_API_KEY), triggered by
// explicit player action (import), never on a render path. Base URL is
// overridable via env so tests/e2e point at a fake and no real key is hit.

const STEAM_API_BASE = process.env.STEAM_API_BASE ?? "https://api.steampowered.com";

export interface OwnedGame {
  appid: number;
  name: string;
  playtimeMinutes: number;
}

function apiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY is not set.");
  return key;
}

/**
 * The player's owned games (with names + playtime). Returns `null` when the
 * profile's game details are **private** (Steam returns an empty `response`),
 * and `[]` for a public profile that genuinely owns nothing — the caller
 * distinguishes the two for messaging. Throws only on a transport/Steam-side
 * failure (surfaced to the player as "try again later").
 */
export async function getOwnedGames(steamId: string, fetchImpl: typeof fetch = fetch): Promise<OwnedGame[] | null> {
  const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey()}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
  const json = (await res.json()) as {
    response?: { game_count?: number; games?: { appid: number; name: string; playtime_forever?: number }[] };
  };
  const response = json.response;
  // A private profile returns an empty `response` object (no game_count, no
  // games). Distinguish that from a public-but-empty library (game_count 0).
  if (!response || (response.game_count === undefined && response.games === undefined)) return null;
  return (response.games ?? []).map((g) => ({
    appid: g.appid,
    name: g.name,
    playtimeMinutes: g.playtime_forever ?? 0,
  }));
}

/** The app ids the player has played recently — used only to pre-select. */
export async function getRecentlyPlayedAppIds(steamId: string, fetchImpl: typeof fetch = fetch): Promise<Set<number>> {
  const url = `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey()}&steamid=${steamId}&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Steam GetRecentlyPlayedGames failed: ${res.status}`);
  const json = (await res.json()) as { response?: { games?: { appid: number }[] } };
  return new Set((json.response?.games ?? []).map((g) => g.appid));
}
