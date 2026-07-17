// Seeds the `games` curation table (035) with the multiplayer/co-op
// titles from Steam's "most played" chart, so Post a Game's typeahead
// (036) suggests real popular games and each gets the headline-image
// treatment. Postings stay free text (ADR 0001) -- this only populates
// the SUGGESTION/curation layer, it never restricts what can be posted.
//
// Single-player titles and non-game utilities from the chart were
// excluded by hand (Wallpaper Engine, Crosshair X, Cyberpunk 2077,
// etc.). GTA V's two store entries (Legacy + Enhanced) are merged into
// one. Names are the Steam titles with (tm)/(r) stripped and all-caps
// stylings title-cased.
//
// Idempotent and cross-table safe: skips any game whose normalized name
// already exists (as a game OR an alias), and skips any alias already
// claimed. Never deletes or overwrites an existing row -- safe to re-run
// against local AND prod (seed rows are a manual step; drizzle-kit push
// only reconciles schema).
//   npx tsx scripts/seed-popular-games.ts
// An explicitly-set DATABASE_URL always wins (e.g. a one-off prod run:
// DATABASE_URL=<neon-url> npx tsx scripts/seed-popular-games.ts). Only
// fall back to .env.local's local DB when nothing is set -- so a prod
// run can never be silently redirected to the local database.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Missing .env.local is fine if DATABASE_URL is provided another way.
  }
}

type Seed = { name: string; aliases?: string[] };

const GAMES: Seed[] = [
  { name: "Counter-Strike 2", aliases: ["cs2"] },
  { name: "Palworld" },
  { name: "Dota 2", aliases: ["dota"] },
  { name: "FiveM" },
  { name: "PUBG: Battlegrounds", aliases: ["pubg"] },
  { name: "EA Sports FC 26", aliases: ["fc 26", "ea fc 26"] },
  { name: "Rust" },
  { name: "Marvel Rivals" },
  { name: "Dead by Daylight", aliases: ["dbd"] },
  { name: "Tom Clancy's Rainbow Six Siege", aliases: ["rainbow six siege", "r6 siege", "r6"] },
  { name: "Grand Theft Auto V", aliases: ["gta v", "gta 5", "gta"] },
  { name: "Apex Legends", aliases: ["apex"] },
  { name: "Warframe" },
  { name: "Destiny 2" },
  { name: "Deadlock" },
  { name: "Team Fortress 2", aliases: ["tf2"] },
  { name: "Overwatch 2", aliases: ["overwatch", "ow2"] },
  { name: "Path of Exile 2", aliases: ["poe2", "poe 2"] },
  { name: "Baldur's Gate 3", aliases: ["bg3"] },
  { name: "VRChat" },
  { name: "Stardew Valley" },
  { name: "DayZ" },
  { name: "Battlefield 6", aliases: ["bf6"] },
  { name: "Delta Force" },
  { name: "War Thunder" },
  { name: "Call of Duty", aliases: ["cod"] },
  { name: "ARC Raiders" },
  { name: "Hearts of Iron IV", aliases: ["hoi4"] },
  { name: "Payday 2" },
  { name: "7 Days to Die" },
  { name: "Granblue Fantasy: Relink" },
  { name: "Project Zomboid" },
  { name: "Red Dead Redemption 2", aliases: ["rdr2"] },
  { name: "Elden Ring" },
  { name: "Euro Truck Simulator 2", aliases: ["ets2"] },
  { name: "Left 4 Dead 2", aliases: ["l4d2"] },
  { name: "Garry's Mod", aliases: ["gmod"] },
  { name: "Forza Horizon 6" },
  { name: "Helldivers 2" },
  { name: "Rocket League" },
  { name: "Terraria" },
  { name: "R.E.P.O." },
  { name: "Total War: Warhammer III", aliases: ["total war warhammer 3", "twwh3"] },
  { name: "Sid Meier's Civilization VI", aliases: ["civ vi", "civ 6", "civilization vi"] },
  { name: "Farming Simulator 25", aliases: ["fs25"] },
  { name: "Football Manager 26", aliases: ["fm26"] },
];

async function main() {
  // Dynamic imports: src/db/index.ts reads DATABASE_URL at import time,
  // and static imports hoist ahead of the loadEnvFile() call above.
  const { db } = await import("../src/db");
  const { games, gameAliases } = await import("../src/db/schema");
  const { normalizeGame } = await import("../src/lib/games/normalize-game");
  const { eq } = await import("drizzle-orm");

  // Is this normalized string already a game name or an alias? (FR-015's
  // cross-table rule -- the two unique indexes can't span each other.)
  async function claimedBy(normalized: string): Promise<"game" | "alias" | null> {
    const [nameHit] = await db.select({ id: games.id }).from(games).where(eq(games.normalizedName, normalized)).limit(1);
    if (nameHit) return "game";
    const [aliasHit] = await db.select({ id: gameAliases.id }).from(gameAliases).where(eq(gameAliases.normalizedAlias, normalized)).limit(1);
    if (aliasHit) return "alias";
    return null;
  }

  let gamesAdded = 0;
  let gamesSkipped = 0;
  let aliasesAdded = 0;
  let aliasesSkipped = 0;

  for (const entry of GAMES) {
    const name = entry.name.trim();
    const normalized = normalizeGame(name);

    // Resolve the game's id -- reuse an existing row, or insert a new one.
    let gameId: string;
    const [existing] = await db.select({ id: games.id }).from(games).where(eq(games.normalizedName, normalized)).limit(1);
    if (existing) {
      gameId = existing.id;
      gamesSkipped += 1;
      console.log(`= game "${name}" already exists`);
    } else {
      const aliasClash = await claimedBy(normalized);
      if (aliasClash === "alias") {
        console.warn(`! skipping game "${name}" -- its name is already an alias of another game`);
        continue;
      }
      const [row] = await db.insert(games).values({ name, normalizedName: normalized }).returning({ id: games.id });
      gameId = row.id;
      gamesAdded += 1;
      console.log(`+ added game "${name}"`);
    }

    for (const rawAlias of entry.aliases ?? []) {
      const alias = normalizeGame(rawAlias);
      if (!alias) continue;
      const claim = await claimedBy(alias);
      if (claim) {
        aliasesSkipped += 1;
        console.log(`  = alias "${alias}" already ${claim === "game" ? "a game name" : "an alias"}`);
        continue;
      }
      await db.insert(gameAliases).values({ gameId, normalizedAlias: alias });
      aliasesAdded += 1;
      console.log(`  + alias "${alias}" -> "${name}"`);
    }
  }

  console.log(
    `\nDone. Games: +${gamesAdded} added, ${gamesSkipped} already present. Aliases: +${aliasesAdded} added, ${aliasesSkipped} already present.`,
  );
  process.exit(0);
}

main();

export {};
