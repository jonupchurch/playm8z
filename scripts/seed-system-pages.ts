// Admin Content Pages (021) Foundational-phase seed -- inserts the
// three system pages (About Us, Privacy Policy, Terms of Use) as real
// `system = true`, published ContentPage rows. No prior feature has
// ever written a ContentPage row, so a fresh deployment needs this run
// once (data-model.md's Seed data table). Idempotent: skips any slug
// that already exists, safe to re-run.
//
// data-model.md lists these slugs with a leading "/" (`/about`, etc.),
// but `014`'s real `contentPages.slug` convention (its own seed script,
// e2e spec) stores bare slugs matched against the `/pages/[slug]`
// dynamic route -- a stored leading slash would never route. Using
// bare slugs here to match the real convention; the leading "/" is
// added only for cosmetic display in the admin table.
//   npx tsx scripts/seed-system-pages.ts
try {
  process.loadEnvFile(".env.local");
} catch {
  // Missing .env.local is fine if DATABASE_URL is already set.
}

async function main() {
  const { db } = await import("../src/db");
  const { contentPages } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const systemPages = [
    {
      slug: "about",
      title: "About Us",
      blocks: [{ type: "p" as const, text: "This page is a starting point -- edit it to tell players who playm8z is for." }],
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      blocks: [{ type: "p" as const, text: "This page is a starting point -- edit it to describe how playm8z handles player data." }],
    },
    {
      slug: "terms",
      title: "Terms of Use",
      blocks: [{ type: "p" as const, text: "This page is a starting point -- edit it to lay out the rules for using playm8z." }],
    },
    // Added alongside the sitewide footer, which links this one plus
    // Privacy/Terms. Existing deployments already ran this script for
    // the first three pages; the skip-if-exists loop below means a
    // re-run seeds only this new page.
    {
      slug: "cookies",
      title: "Cookies",
      blocks: [{ type: "p" as const, text: "This page is a starting point -- edit it to explain which cookies playm8z sets and why." }],
    },
  ];

  for (const page of systemPages) {
    const [existing] = await db.select({ id: contentPages.id }).from(contentPages).where(eq(contentPages.slug, page.slug)).limit(1);
    if (existing) {
      console.log(`Skipped "${page.slug}" -- already exists.`);
      continue;
    }
    await db.insert(contentPages).values({ ...page, status: "published", system: true });
    console.log(`Seeded system page "${page.slug}".`);
  }

  process.exit(0);
}

main();

export {};
