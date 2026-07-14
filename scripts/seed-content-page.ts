// Dev convenience only -- Admin Content Pages doesn't exist yet to
// create a page through the UI (quickstart.md). Run with:
//   npx tsx scripts/seed-content-page.ts
// Idempotent: clears any existing `community-guidelines` row, then
// inserts one fresh published sample covering every block type.
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
  const { contentPages } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const slug = "community-guidelines";
  await db.delete(contentPages).where(eq(contentPages.slug, slug));

  await db.insert(contentPages).values({
    slug,
    title: "Community Guidelines",
    status: "published",
    blocks: [
      {
        type: "p",
        text: "playm8z only works when it feels safe and welcoming. These guidelines keep the community fun for everyone — casual and competitive, every game, every table.",
      },
      { type: "h2", text: "Be a good teammate" },
      {
        type: "list",
        items: [
          "Communicate honestly about your skill, availability and expectations.",
          "Show up when you commit — or give people a heads-up if plans change.",
          "Keep voice and text chat respectful, even when you lose.",
        ],
      },
      { type: "h2", text: "Zero tolerance" },
      {
        type: "list",
        items: [
          "No harassment, hate speech, slurs, or targeted abuse.",
          "No scams, phishing, account sales, or paid boosting.",
        ],
      },
      {
        type: "callout",
        text: "Playing with younger gamers? Keep it age-appropriate and use the age-group filters when posting a party.",
      },
      { type: "divider" },
      { type: "h2", text: "Reporting & enforcement" },
      {
        type: "p",
        text: "Every posting, profile, forum post and message has a report option. Our moderators review reports quickly and take action ranging from a warning to a permanent ban depending on severity.",
      },
      { type: "quote", text: "Play hard, play fair, play together." },
    ],
  });

  console.log(`Seeded content page "${slug}" (published, every block type).`);
  process.exit(0);
}

main();

// See seed-postings.ts's own comment -- forces module scope so this
// file's `main()` doesn't collide with any sibling script's own.
export {};
