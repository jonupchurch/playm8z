// One-time recovery (042, ADR 0015): seed `userGames` from the deprecated
// `users.gamesPlayed` snapshot for players who have NO userGames rows, so
// pre-fix players whose onboarding game picks never reached their profile are
// recovered. userGames always wins — a player with any curated game is skipped.
// Idempotent and safe to re-run against local and prod.
//
// Usage:
//   npx tsx scripts/backfill-user-games.ts
//   DATABASE_URL=<url> npx tsx scripts/backfill-user-games.ts
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fine if DATABASE_URL is provided another way
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const { backfillUserGames } = await import("../src/lib/games/backfill-user-games");
  const report = await backfillUserGames();
  console.log(`Backfill done. seeded=${report.seeded}, skipped-curated=${report.skippedCurated}, empty=${report.empty}`);
  process.exit(0);
}

main();

export {};
