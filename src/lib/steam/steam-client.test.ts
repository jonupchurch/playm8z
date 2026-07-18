import { beforeAll, describe, expect, it, vi } from "vitest";
import { getOwnedGames, getRecentlyPlayedAppIds } from "./steam-client";

beforeAll(() => {
  process.env.STEAM_API_KEY = "test-key";
});

function fetchJson(json: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, json: async () => json })) as unknown as typeof fetch;
}

describe("getOwnedGames", () => {
  it("maps games to {appid,name,playtimeMinutes}", async () => {
    const games = await getOwnedGames(
      "1",
      fetchJson({
        response: {
          game_count: 2,
          games: [
            { appid: 730, name: "Counter-Strike 2", playtime_forever: 6000 },
            { appid: 570, name: "Dota 2", playtime_forever: 120 },
          ],
        },
      }),
    );
    expect(games).toEqual([
      { appid: 730, name: "Counter-Strike 2", playtimeMinutes: 6000 },
      { appid: 570, name: "Dota 2", playtimeMinutes: 120 },
    ]);
  });

  it("returns null for a private profile (empty response object)", async () => {
    expect(await getOwnedGames("1", fetchJson({ response: {} }))).toBeNull();
  });

  it("returns [] for a public profile that owns nothing", async () => {
    expect(await getOwnedGames("1", fetchJson({ response: { game_count: 0, games: [] } }))).toEqual([]);
  });

  it("throws on a transport/Steam failure", async () => {
    await expect(getOwnedGames("1", fetchJson({}, false))).rejects.toThrow();
  });
});

describe("getRecentlyPlayedAppIds", () => {
  it("returns the set of recent appids", async () => {
    const set = await getRecentlyPlayedAppIds("1", fetchJson({ response: { games: [{ appid: 730 }, { appid: 570 }] } }));
    expect(set).toEqual(new Set([730, 570]));
  });

  it("returns an empty set when there are none", async () => {
    expect(await getRecentlyPlayedAppIds("1", fetchJson({ response: {} }))).toEqual(new Set());
  });
});
