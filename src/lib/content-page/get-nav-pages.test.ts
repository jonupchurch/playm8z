import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { getNavPages } from "./get-nav-pages";

// contentPages is a shared table holding the four real seeded `system`
// pages plus whatever other specs have created, so every assertion here
// is scoped to this run's own slugs rather than asserting a total count
// -- content-page.spec.ts seeds published custom pages of its own that
// would otherwise drift into these results.
const runId = crypto.randomUUID().slice(0, 8);
const zebraSlug = `nav-zebra-${runId}`;
const alphaSlug = `nav-alpha-${runId}`;
const draftSlug = `nav-draft-${runId}`;
const systemSlug = `nav-system-${runId}`;
const allSlugs = [zebraSlug, alphaSlug, draftSlug, systemSlug];

beforeAll(async () => {
  await db.insert(contentPages).values([
    // Inserted Zebra-first so ordering assertions can't pass by accident
    // on insertion order.
    { slug: zebraSlug, title: `Zebra ${runId}`, status: "published", system: false, blocks: [] },
    { slug: alphaSlug, title: `Alpha ${runId}`, status: "published", system: false, blocks: [] },
    { slug: draftSlug, title: `Draft ${runId}`, status: "draft", system: false, blocks: [] },
    { slug: systemSlug, title: `System ${runId}`, status: "published", system: true, blocks: [] },
  ]);
});

afterAll(async () => {
  await db.delete(contentPages).where(inArray(contentPages.slug, allSlugs));
});

describe("getNavPages", () => {
  it("returns published non-system pages", async () => {
    const slugs = (await getNavPages()).map((page) => page.slug);
    expect(slugs).toContain(zebraSlug);
    expect(slugs).toContain(alphaSlug);
  });

  it("excludes draft pages, which /pages/[slug] would 404 for a nav visitor anyway", async () => {
    const slugs = (await getNavPages()).map((page) => page.slug);
    expect(slugs).not.toContain(draftSlug);
  });

  it("excludes system pages, which have their own fixed homes in the nav and footer", async () => {
    const slugs = (await getNavPages()).map((page) => page.slug);
    expect(slugs).not.toContain(systemSlug);
  });

  it("orders by title rather than insertion order", async () => {
    const mine = (await getNavPages()).filter((page) => page.slug.endsWith(runId));
    expect(mine.map((page) => page.title)).toEqual([`Alpha ${runId}`, `Zebra ${runId}`]);
  });

  it("never returns the real seeded system pages", async () => {
    const slugs = (await getNavPages()).map((page) => page.slug);
    expect(slugs).not.toContain("about");
    expect(slugs).not.toContain("privacy");
    expect(slugs).not.toContain("terms");
    expect(slugs).not.toContain("cookies");
  });
});
