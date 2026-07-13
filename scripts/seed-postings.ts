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

  const HOUR = 60 * 60 * 1000;
  const now = Date.now();

  const sample = [
    {
      game: "Helldivers 2",
      genre: "Co-op PvE",
      title: "Casual Dives — all welcome",
      blurb: "Here to blow stuff up and laugh. No pressure, any level.",
      vibe: "fun",
      region: "na-west",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "cross",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 2,
      scheduledDate: new Date(now + 2 * HOUR),
    },
    {
      game: "Valorant",
      genre: "FPS",
      title: "Ranked grind — Diamond push",
      blurb: "Need 2 for a serious climb. Mic required, comms over ego.",
      vibe: "serious",
      region: "eu-west",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 5,
      seatsOpen: 2,
      scheduledDate: new Date(now + 5 * HOUR),
    },
    {
      game: "Baldur's Gate 3",
      genre: "RPG",
      title: "Honour Mode campaign",
      blurb: "Long-haul co-op run, voice on Discord. Committed but chill.",
      vibe: "serious",
      region: "na-east",
      ageGroup: "18",
      timeSlots: ["weekend"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 5,
      seatsOpen: 1,
      scheduledDate: null,
    },
    {
      game: "Lethal Company",
      genre: "Co-op PvE",
      title: "Chaos & screaming",
      blurb: "Pure fun, expect zero survival skill. Bring a mic and a sense of humor.",
      vibe: "fun",
      region: "eu-west",
      ageGroup: "18",
      timeSlots: ["late"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 4,
      seatsOpen: 3,
      scheduledDate: new Date(now + HOUR),
    },
    {
      game: "Deep Rock Galactic",
      genre: "Co-op PvE",
      title: "Rock & Stone, all welcome",
      blurb: "Greenbeards encouraged. Mining, laughs, good times.",
      vibe: "fun",
      region: "na-east",
      ageGroup: "18",
      timeSlots: ["late"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 4,
      seatsOpen: 1,
      scheduledDate: null,
    },
    {
      game: "Valorant",
      genre: "FPS",
      title: "Unrated just for fun",
      blurb: "Warmups and goofing around. No rank pressure whatsoever.",
      vibe: "fun",
      region: "na-west",
      ageGroup: "18",
      timeSlots: ["afternoon"],
      platform: "pc",
      micRequired: false,
      seatsTotal: 5,
      seatsOpen: 4,
      scheduledDate: null,
    },
    {
      game: "D&D 5e",
      genre: "TTRPG",
      title: "Curse of Strahd — weekly",
      blurb: "Story-focused table, newcomers welcome. Session zero this week.",
      vibe: "serious",
      region: "na-east",
      ageGroup: "18",
      timeSlots: ["evening", "weekend"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 6,
      seatsOpen: 2,
      scheduledDate: new Date(now + 3 * 24 * HOUR),
    },
    {
      game: "Catan",
      genre: "Tabletop",
      title: "Board game café meetup",
      blurb: "Casual Catan and snacks. All experience levels, friendly table.",
      vibe: "fun",
      region: "eu-east",
      ageGroup: "18",
      timeSlots: ["afternoon"],
      platform: "table",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 2,
      scheduledDate: new Date(now + 6 * 24 * HOUR),
    },
  ];

  await db.insert(postings).values(sample.map((row) => ({ ...row, hostId: host.id })));

  console.log(`Seeded ${sample.length} open postings, hosted by user ${host.id}.`);
  process.exit(0);
}

main();
