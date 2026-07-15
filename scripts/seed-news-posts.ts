// Dev convenience -- faster than authoring these through Admin News'
// (020) own UI one at a time. Run with:
//   npx tsx scripts/seed-news-posts.ts
// Idempotent: clears existing newsPosts before inserting the fresh
// sample set. Includes exactly one `featured` post and one `upcoming`
// Event post, as quickstart.md's setup expects. Every row is explicitly
// `status: "published"` -- 020's amended search-news.ts only shows
// published (or passed-date scheduled) posts, and the schema's own
// default is `draft`.
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
  const { newsPosts } = await import("../src/db/schema");

  await db.delete(newsPosts);

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const sample = [
    {
      title: "playm8z is now in open beta!",
      excerpt:
        "Anyone can now post games and find their party — no invite code needed. Here's everything that shipped for launch and what's next.",
      category: "Announcement",
      cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
      readTimeMinutes: 3,
      featured: true,
      publishedAt: new Date(now - 0 * DAY),
      status: "published",
      slug: "playm8z-is-now-in-open-beta",
      tags: ["launch", "beta", "product"],
      body: "After months of closed testing with a few thousand players, playm8z is officially open to everyone. No invite code, no waitlist — just post the games you want to play and find your party.\n\n## What shipped for launch\n\n- **Post a game** — set the vibe, region, platform, time slots, party size and more.\n- **Powerful search** — filter by casual vs serious, open slots, age group, mic and keywords.\n- **A community forum** — talk strategy, share clips, and organize groups.\n\n## What's next\n\nWe're already working on deep Discord integration. See you in the lobby.",
    },
    {
      title: "New: filter by tabletop & TTRPGs",
      excerpt:
        "D&D, Pathfinder, board games and more now have first-class genre filters and an in-person tabletop option.",
      category: "Update",
      cover: "linear-gradient(135deg,#ff6b1a,#ff3b6b)",
      readTimeMinutes: 2,
      publishedAt: new Date(now - 2 * DAY),
      status: "published",
      slug: "new-filter-by-tabletop-and-ttrpgs",
      tags: ["tabletop", "ttrpg", "update"],
      body: "Not just video games — playm8z now has first-class support for tabletop and TTRPGs too, including an in-person option so you can find a local table as easily as an online lobby.",
    },
    {
      title: "Summer Co-op Fest — win prizes",
      excerpt: "Two weeks of community co-op challenges with in-game rewards and a leaderboard. Mark your calendar.",
      category: "Event",
      cover: "linear-gradient(135deg,#35d0e0,#ff6b1a)",
      readTimeMinutes: 2,
      upcoming: true,
      publishedAt: new Date(now - 4 * DAY),
      status: "published",
      slug: "summer-co-op-fest-win-prizes",
      tags: ["event", "community"],
      body: "Two weeks of community co-op challenges kick off next month, with in-game rewards and a community leaderboard.",
    },
    {
      title: "Discord integration preview",
      excerpt: "Auto-create voice channels for your party and get LFG pings straight in Discord. Here's an early look.",
      category: "Update",
      cover: "linear-gradient(135deg,#ff3b6b,#ffb000)",
      readTimeMinutes: 4,
      publishedAt: new Date(now - 6 * DAY),
      status: "published",
      slug: "discord-integration-preview",
      tags: ["discord", "update"],
      body: "We're building deep Discord integration: auto-created voice channels for your party and LFG pings piped straight into your server.",
    },
    {
      title: "v1.2 — faster matchmaking & fixes",
      excerpt: "Search is 40% faster, filter chips persist across sessions, and we squashed a batch of profile bugs.",
      category: "Patch Notes",
      cover: "linear-gradient(135deg,#ffb000,#ff3b6b)",
      readTimeMinutes: 5,
      publishedAt: new Date(now - 8 * DAY),
      status: "published",
      slug: "v1-2-faster-matchmaking-and-fixes",
      tags: ["patch-notes"],
      body: "Search is 40% faster, filter chips now persist across sessions, and we squashed a batch of profile bugs reported by the beta crew.",
    },
    {
      title: "Party of the Month: the Deep Rock crew",
      excerpt: "How five strangers became a weekly squad — and what makes a party actually stick together.",
      category: "Community",
      cover: "linear-gradient(135deg,#ff6b1a,#ffb000)",
      readTimeMinutes: 3,
      publishedAt: new Date(now - 10 * DAY),
      status: "published",
      slug: "party-of-the-month-the-deep-rock-crew",
      tags: ["community"],
      body: "How five strangers became a weekly squad — and what makes a party actually stick together, in their own words.",
    },
    {
      title: "Mobile app is on the way",
      excerpt: "Take your parties on the go. The playm8z mobile app enters closed testing next month.",
      category: "Announcement",
      cover: "linear-gradient(135deg,#ff3b6b,#ff6b1a)",
      readTimeMinutes: 2,
      publishedAt: new Date(now - 12 * DAY),
      status: "published",
      slug: "mobile-app-is-on-the-way",
      tags: ["mobile", "announcement"],
      body: "Take your parties on the go. The playm8z mobile app enters closed testing next month — sign up for the waitlist from your account settings.",
    },
  ];

  await db.insert(newsPosts).values(sample);

  console.log(`Seeded ${sample.length} news posts (1 featured, 1 upcoming Event).`);
  process.exit(0);
}

main();

// See seed-postings.ts's own comment -- forces module scope so this
// file's `main()` doesn't collide with any sibling script's own.
export {};
