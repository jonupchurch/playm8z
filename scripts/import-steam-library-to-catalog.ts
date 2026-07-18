// Adds a linked player's PLAYED, MULTIPLAYER Steam games to the shared game
// catalog (035) with their official Steam header art (a local copy in Vercel
// Blob), so those games get curated images and Post-a-Game typeahead
// suggestions. Multiplayer-only, by design: single-player titles are kept out
// of everyone's suggestions.
//
// Config (env):
//   DATABASE_URL, BLOB_READ_WRITE_TOKEN, STEAM_API_KEY  (required)
//   OWNER_EMAIL       (default jonupchurch@gmail.com) -- whose linked SteamID to read
//   STEAM_OWNER_ID    (optional) -- use this SteamID directly instead of OWNER_EMAIL
//   MIN_PLAYTIME_MIN  (default 120) -- only games with at least this many minutes played
//   MP_CACHE          (default ./.mp-cache.json) -- memoizes the appdetails scan so a
//                     second run (e.g. against prod) never re-hits Steam
//
// Idempotent: skips a game whose name/alias is already in the catalog, and
// skips setting an image if one is already set. Safe to re-run local + prod.
//   DATABASE_URL=<url> STEAM_API_KEY=<k> BLOB_READ_WRITE_TOKEN=<t> npx tsx scripts/import-steam-library-to-catalog.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fine if the vars are provided another way
  }
}

const MP_CATEGORY_IDS = new Set([1, 9, 20, 27, 36, 37, 38, 39, 49]); // Multi-player/Co-op/PvP/MMO/etc.
const MIN_PLAYTIME_MIN = Number(process.env.MIN_PLAYTIME_MIN ?? "120");
const CACHE_PATH = process.env.MP_CACHE ?? "./.mp-cache.json";
const UA = { "User-Agent": "Mozilla/5.0" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CacheEntry = { name: string; multiplayer: boolean; headerImage: string | null };
type Cache = Record<string, CacheEntry>;

function loadCache(): Cache {
  try {
    if (existsSync(CACHE_PATH)) return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Cache;
  } catch {
    /* ignore */
  }
  return {};
}
function saveCache(cache: Cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));
}

function isImage(buf: Buffer): boolean {
  if (buf.length < 1024) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return jpeg || png;
}

// One appdetails call: is it multiplayer, and what's its header image?
async function scanApp(appid: number): Promise<CacheEntry | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=en`, { headers: UA });
      if (res.ok) {
        const json = (await res.json()) as Record<string, { success?: boolean; data?: { name?: string; header_image?: string; categories?: { id: number }[] } }>;
        const entry = json?.[String(appid)];
        if (entry?.success && entry.data) {
          const multiplayer = (entry.data.categories ?? []).some((c) => MP_CATEGORY_IDS.has(c.id));
          return { name: entry.data.name ?? "", multiplayer, headerImage: entry.data.header_image ?? null };
        }
        return { name: "", multiplayer: false, headerImage: null }; // delisted/region-locked: treat as non-MP
      }
    } catch {
      /* fall through to retry */
    }
    await sleep(5000); // likely rate-limited: back off and retry once
  }
  return null; // undetermined after retry
}

async function main() {
  const { db } = await import("../src/db");
  const { games, gameAliases, users } = await import("../src/db/schema");
  const { normalizeGame } = await import("../src/lib/games/normalize-game");
  const { eq, and, isNull } = await import("drizzle-orm");
  const { put, list } = await import("@vercel/blob");

  if (!process.env.STEAM_API_KEY) throw new Error("STEAM_API_KEY is not set.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");

  // Resolve the SteamID.
  let steamId = process.env.STEAM_OWNER_ID;
  if (!steamId) {
    const ownerEmail = process.env.OWNER_EMAIL ?? "jonupchurch@gmail.com";
    const [owner] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.email, ownerEmail));
    steamId = owner?.steamId ?? undefined;
    if (!steamId) throw new Error(`No linked SteamID for ${ownerEmail}.`);
  }

  // Owned games, filtered to actually-played.
  const ownedRes = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`,
  );
  const ownedJson = (await ownedRes.json()) as { response?: { games?: { appid: number; name: string; playtime_forever: number }[] } };
  const owned = (ownedJson.response?.games ?? []).filter((g) => g.playtime_forever >= MIN_PLAYTIME_MIN);
  console.log(`Owned games played >= ${MIN_PLAYTIME_MIN}m: ${owned.length}`);

  // Scan (cached) for multiplayer + header art.
  const cache = loadCache();
  let scanned = 0;
  for (const g of owned) {
    if (cache[g.appid]) continue;
    const entry = await scanApp(g.appid);
    if (entry) {
      if (!entry.name) entry.name = g.name; // fall back to the owned-list name
      cache[g.appid] = entry;
      scanned += 1;
      if (scanned % 10 === 0) {
        saveCache(cache);
        console.log(`  scanned ${scanned} new (${Object.keys(cache).length} cached)…`);
      }
      await sleep(1500); // stay under Steam's appdetails rate limit
    } else {
      console.warn(`  ! could not determine appid ${g.appid} (${g.name}) -- skipping this run`);
    }
  }
  saveCache(cache);

  const multiplayer = owned.map((g) => ({ appid: g.appid, ...cache[g.appid] })).filter((g) => g && g.multiplayer);
  console.log(`Multiplayer among them: ${multiplayer.length}`);

  // Cross-table claim check (FR-015): name already a game or an alias?
  async function claimed(normalized: string): Promise<boolean> {
    const [n] = await db.select({ id: games.id }).from(games).where(eq(games.normalizedName, normalized)).limit(1);
    if (n) return true;
    const [a] = await db.select({ id: gameAliases.id }).from(gameAliases).where(eq(gameAliases.normalizedAlias, normalized)).limit(1);
    return Boolean(a);
  }

  let gamesAdded = 0;
  let imagesSet = 0;
  let skipped = 0;

  for (const g of multiplayer) {
    const name = g.name.trim();
    if (!name) continue;
    const normalized = normalizeGame(name);

    // Resolve or create the catalog row.
    let gameId: string;
    let hasImage = false;
    const [existing] = await db.select({ id: games.id, imageUrl: games.imageUrl }).from(games).where(eq(games.normalizedName, normalized)).limit(1);
    if (existing) {
      gameId = existing.id;
      hasImage = Boolean(existing.imageUrl);
      skipped += 1;
    } else {
      if (await claimed(normalized)) {
        skipped += 1;
        continue; // name is an alias of another game
      }
      const [row] = await db.insert(games).values({ name, normalizedName: normalized }).returning({ id: games.id });
      gameId = row.id;
      gamesAdded += 1;
    }

    // Set the image if the game doesn't have one yet.
    if (!hasImage && g.headerImage) {
      const path = `game-images/steam-${g.appid}.jpg`;
      let url: string | null = null;
      const found = (await list({ prefix: path })).blobs.find((b) => b.pathname === path);
      if (found) {
        url = found.url;
      } else {
        try {
          const res = await fetch(g.headerImage, { redirect: "follow", headers: UA });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            if (isImage(buf)) {
              const blob = await put(path, buf, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/jpeg" });
              url = blob.url;
            }
          }
        } catch {
          /* leave imageless -> generated visual */
        }
      }
      if (url) {
        await db.update(games).set({ imageUrl: url }).where(and(eq(games.id, gameId), isNull(games.imageUrl)));
        imagesSet += 1;
      }
    }
  }

  console.log(`\nDone. Catalog games added: ${gamesAdded}, images set: ${imagesSet}, already present/skipped: ${skipped}.`);
  process.exit(0);
}

main();

export {};
