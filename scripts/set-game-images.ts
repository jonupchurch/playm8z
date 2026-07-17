// Gives each curated game (035) a real headline image by storing a local
// copy of its official Steam header in the project's Vercel Blob store and
// pointing games.imageUrl at it. Runs after seed-popular-games.ts.
//
// App IDs were resolved from Steam's store-search API and hand-verified
// (see the map below). FiveM is intentionally absent -- it's a standalone
// GTA V mod with no Steam app, so it keeps its generated visual. Overwatch
// and Rocket League IDs were corrected by hand (search returned a DLC entry
// and no result respectively).
//
// Idempotent and safe to re-run against local AND prod:
//   - skips any game that already has an imageUrl (never clobbers an
//     admin-set image),
//   - reuses an already-uploaded Blob (deterministic path) instead of
//     re-uploading,
//   - validates the downloaded bytes are a real image, so a Steam 404 HTML
//     page is never stored -- that game just keeps its generated visual.
//
// Needs DATABASE_URL (which DB to update) and BLOB_READ_WRITE_TOKEN (which
// store to upload to) in the environment. Local run uses .env.local; a prod
// run passes both explicitly:
//   DATABASE_URL=<neon> BLOB_READ_WRITE_TOKEN=<token> npx tsx scripts/set-game-images.ts
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Missing .env.local is fine if the vars are provided another way.
  }
}

// name -> Steam appid. Names must match seed-popular-games.ts exactly.
const APPIDS: Record<string, number> = {
  "Counter-Strike 2": 730,
  Palworld: 1623730,
  "Dota 2": 570,
  "PUBG: Battlegrounds": 578080,
  "EA Sports FC 26": 3405690,
  Rust: 252490,
  "Marvel Rivals": 2767030,
  "Dead by Daylight": 381210,
  "Tom Clancy's Rainbow Six Siege": 359550,
  "Grand Theft Auto V": 3240220,
  "Apex Legends": 1172470,
  Warframe: 230410,
  "Destiny 2": 1085660,
  Deadlock: 1422450,
  "Team Fortress 2": 440,
  "Overwatch 2": 2357570,
  "Path of Exile 2": 2694490,
  "Baldur's Gate 3": 1086940,
  VRChat: 438100,
  "Stardew Valley": 413150,
  DayZ: 221100,
  "Battlefield 6": 2807960,
  "Delta Force": 2507950,
  "War Thunder": 236390,
  "Call of Duty": 1938090,
  "ARC Raiders": 1808500,
  "Hearts of Iron IV": 394360,
  "Payday 2": 218620,
  "7 Days to Die": 251570,
  "Granblue Fantasy: Relink": 881020,
  "Project Zomboid": 108600,
  "Red Dead Redemption 2": 1174180,
  "Elden Ring": 1245620,
  "Euro Truck Simulator 2": 227300,
  "Left 4 Dead 2": 550,
  "Garry's Mod": 4000,
  "Forza Horizon 6": 2483190,
  "Helldivers 2": 553850,
  "Rocket League": 252950,
  Terraria: 105600,
  "R.E.P.O.": 3241660,
  "Total War: Warhammer III": 1142710,
  "Sid Meier's Civilization VI": 289070,
  "Farming Simulator 25": 2300320,
  "Football Manager 26": 3551340,
};

const UA = { "User-Agent": "Mozilla/5.0" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isImage(buf: Buffer): boolean {
  if (buf.length < 1024) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return jpeg || png;
}

async function tryDownload(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: UA });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isImage(buf)) return null;
    return { buf, contentType: buf[0] === 0x89 ? "image/png" : "image/jpeg" };
  } catch {
    return null;
  }
}

async function fetchHeader(appid: number): Promise<{ buf: Buffer; contentType: string } | null> {
  // Conventional CDN header first (fast, no rate limit).
  const direct = await tryDownload(`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`);
  if (direct) return direct;
  // Fallback: the canonical header_image from appdetails, which handles
  // newer titles whose assets moved off the conventional path.
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`, { headers: UA });
    const json = (await res.json()) as Record<string, { data?: { header_image?: string } }>;
    const headerImage = json?.[String(appid)]?.data?.header_image;
    if (headerImage) return await tryDownload(headerImage);
  } catch {
    // fall through
  }
  return null;
}

async function main() {
  const { db } = await import("../src/db");
  const { games } = await import("../src/db/schema");
  const { normalizeGame } = await import("../src/lib/games/normalize-game");
  const { eq } = await import("drizzle-orm");
  const { put, list } = await import("@vercel/blob");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set -- can't store images.");
    process.exit(1);
  }

  let set = 0;
  let reused = 0;
  let alreadyHad = 0;
  let noRow = 0;
  let noImage = 0;

  for (const [name, appid] of Object.entries(APPIDS)) {
    const normalized = normalizeGame(name);
    const [game] = await db
      .select({ id: games.id, imageUrl: games.imageUrl })
      .from(games)
      .where(eq(games.normalizedName, normalized))
      .limit(1);

    if (!game) {
      console.log(`? no game row for "${name}" -- run seed-popular-games.ts first`);
      noRow += 1;
      continue;
    }
    if (game.imageUrl) {
      console.log(`= "${name}" already has an image`);
      alreadyHad += 1;
      continue;
    }

    const path = `game-images/steam-${appid}.jpg`;

    // Reuse an already-uploaded blob (e.g. the local run uploaded it) rather
    // than re-downloading + re-uploading.
    let url: string | null = null;
    const existing = await list({ prefix: path });
    const match = existing.blobs.find((b) => b.pathname === path);
    if (match) {
      url = match.url;
      reused += 1;
    } else {
      const img = await fetchHeader(appid);
      if (!img) {
        console.log(`! no valid header for "${name}" (appid ${appid}) -- keeping generated visual`);
        noImage += 1;
        await sleep(200);
        continue;
      }
      const blob = await put(path, img.buf, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: img.contentType,
      });
      url = blob.url;
    }

    await db.update(games).set({ imageUrl: url }).where(eq(games.id, game.id));
    console.log(`+ "${name}" -> ${url}`);
    set += 1;
    await sleep(200);
  }

  console.log(
    `\nDone. imageUrl set on ${set} (${reused} reused an existing blob), ${alreadyHad} already had one, ${noImage} had no valid header, ${noRow} had no game row.`,
  );
  process.exit(0);
}

main();

export {};
