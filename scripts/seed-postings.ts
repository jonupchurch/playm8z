// Dev convenience only -- Post a Game doesn't exist yet to create
// postings through the UI (quickstart.md). Run with:
//   npx tsx scripts/seed-postings.ts
// Requires at least one registered user (sign up via /signup first);
// all sample postings are hosted by the first user found. Idempotent:
// clears existing postings before inserting the fresh sample set.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Missing .env.local is fine if DATABASE_URL is already set.
}

async function main() {
  // Dynamic imports: src/db/index.ts reads DATABASE_URL at import time,
  // and static imports are hoisted ahead of the loadEnvFile() call above
  // regardless of source order -- deferring the import avoids that.
  const { db } = await import("../src/db");
  const { postings, users } = await import("../src/db/schema");

  const [host] = await db.select({ id: users.id }).from(users).limit(1);
  if (!host) {
    console.error("No users found -- sign up an account at /signup first, then re-run this script.");
    process.exit(1);
  }

  await db.delete(postings);

  const sample = [
    {
      game: "Helldivers 2",
      title: "Casual Dives — all welcome",
      blurb: "Here to blow stuff up and laugh. No pressure, any level.",
      vibe: "fun",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 2,
    },
    {
      game: "Valorant",
      title: "Ranked grind — Diamond push",
      blurb: "Need 2 for a serious climb. Mic required, comms over ego.",
      vibe: "serious",
      region: "eu-west",
      seatsTotal: 5,
      seatsOpen: 2,
    },
    {
      game: "Baldur's Gate 3",
      title: "Honour Mode campaign",
      blurb: "Long-haul co-op run, voice on Discord. Committed but chill.",
      vibe: "serious",
      region: "na-east",
      seatsTotal: 5,
      seatsOpen: 1,
    },
    {
      game: "Lethal Company",
      title: "Chaos & screaming",
      blurb: "Pure fun, expect zero survival skill. Bring a mic and a sense of humor.",
      vibe: "fun",
      region: "eu-west",
      seatsTotal: 4,
      seatsOpen: 3,
    },
    {
      game: "Deep Rock Galactic",
      title: "Rock & Stone, all welcome",
      blurb: "Greenbeards encouraged. Mining, laughs, good times.",
      vibe: "fun",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 1,
    },
    {
      game: "Valorant",
      title: "Unrated just for fun",
      blurb: "Warmups and goofing around. No rank pressure whatsoever.",
      vibe: "fun",
      region: "na-west",
      seatsTotal: 5,
      seatsOpen: 4,
    },
  ];

  await db.insert(postings).values(sample.map((row) => ({ ...row, hostId: host.id })));

  console.log(`Seeded ${sample.length} open postings, hosted by user ${host.id}.`);
  process.exit(0);
}

main();
