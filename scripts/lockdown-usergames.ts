// One-time, idempotent lockdown migration for feature 043 (ADR 0016). Order is
// load-bearing:
//   1. collapse duplicate userGames rows (the unique index fails while dups exist)
//   2. create the per-player unique index on (userId, lower(btrim(game)))
//   3. drop the retired users.gamesPlayed column
// Safe to run repeatedly and against any environment. Run local first, then prod
// (pull the prod DATABASE_URL to a temp path OUTSIDE the repo and pass it in):
//   npx tsx scripts/lockdown-usergames.ts
//   DATABASE_URL=<prod-url> npx tsx scripts/lockdown-usergames.ts
import { sql } from "drizzle-orm";

async function main() {
  // Local: pull DATABASE_URL from .env.local. Prod: DATABASE_URL is passed in
  // the environment -- never let .env.local clobber it (guarded, so a prod run
  // can't accidentally hit local).
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      /* already set in the environment (CI/prod) */
    }
  }

  const { db } = await import("../src/db");
  const { dedupeUserGames } = await import("../src/lib/games/dedupe-user-games");

  const dedupe = await dedupeUserGames();
  console.log(`dedupe: ${dedupe.groups} duplicate group(s) collapsed, ${dedupe.deleted} row(s) removed`);

  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "userGames_userId_normgame_uniq" ON "userGames" ("userId", lower(btrim("game")))`,
  );
  console.log('index: "userGames_userId_normgame_uniq" ensured');

  await db.execute(sql`ALTER TABLE "user" DROP COLUMN IF EXISTS "gamesPlayed"`);
  console.log('column: users.gamesPlayed dropped (if present)');

  const idx = await db.execute(
    sql`SELECT indexname FROM pg_indexes WHERE tablename = 'userGames' AND indexname = 'userGames_userId_normgame_uniq'`,
  );
  const col = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'gamesPlayed'`,
  );
  const indexPresent = idx.length === 1;
  const columnGone = col.length === 0;
  console.log(`verify: unique index present = ${indexPresent}; gamesPlayed column gone = ${columnGone}`);
  if (!indexPresent || !columnGone) {
    throw new Error("Lockdown verification failed -- index missing or column still present");
  }
  console.log("lockdown-usergames: complete");
  await process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
