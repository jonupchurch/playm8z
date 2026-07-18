import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";

// Category chips use a visually-hidden native radio input under a
// visible label span (Tailwind's `.sr-only` uses clip-path, which
// fails Playwright's own actionability check) -- click the label
// itself, Forum index's own established `selectChip()` pattern.
function selectCategory(page: Page, label: string) {
  return page.locator('label:has(input[name="news-category"])').filter({ hasText: label }).first().click();
}

const runId = crypto.randomUUID().slice(0, 8);
const featuredTitle = `Featured beta launch ${runId}`;
const searchableTitle = `Update one searchable ${runId}`;
const eventTitle = `Community fest ${runId}`;

const postIds: string[] = [];

test.beforeAll(async () => {
  // searchNews() queries the whole newsPosts table with no per-test
  // scoping (Home's own getTrending() precedent for this exact class
  // of shared-table test isolation) -- clear it first so this spec's
  // exact-count/pagination assertions aren't at the mercy of whatever
  // else already exists (e.g. npm run db:seed-news-posts' own sample
  // rows).
  await db.delete(newsPosts);

  const now = Date.now();

  const [featured] = await db
    .insert(newsPosts)
    .values({
      title: featuredTitle,
      excerpt: "The big one everyone's been waiting for.",
      category: "Announcement",
      featured: true,
      status: "published",
      publishedAt: new Date(now),
      slug: `nf-featured-${runId}`,
    })
    .returning({ id: newsPosts.id });
  postIds.push(featured.id);

  const rest = [
    { title: `Second announcement ${runId}`, category: "Announcement", offset: 1 },
    { title: searchableTitle, category: "Update", offset: 2 },
    { title: eventTitle, category: "Event", upcoming: true, offset: 3 },
    { title: `Update two ${runId}`, category: "Update", offset: 4 },
    { title: `Party of the month ${runId}`, category: "Community", offset: 5 },
    { title: `Patch v1 ${runId}`, category: "Patch Notes", offset: 6 },
    { title: `Patch v2 ${runId}`, category: "Patch Notes", offset: 7 },
  ];

  for (const post of rest) {
    const [row] = await db
      .insert(newsPosts)
      .values({
        title: post.title,
        excerpt: `Excerpt for ${post.title}`,
        category: post.category,
        upcoming: post.upcoming ?? false,
        status: "published",
        publishedAt: new Date(now - post.offset * 60_000),
        slug: `nf-rest-${post.offset}-${runId}`,
      })
      .returning({ id: newsPosts.id });
    postIds.push(row.id);
  }
});

test.afterAll(async () => {
  for (const id of postIds) {
    await db.delete(newsPosts).where(eq(newsPosts.id, id));
  }
});

test.describe("News feed (quickstart.md Scenarios 1-2)", () => {
  test("loads with no login required, showing the featured post excluded from the grid", async ({ page }) => {
    await page.goto("/news");
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.getByText("📌 Featured")).toBeVisible();
    await expect(page.getByRole("heading", { name: featuredTitle })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("selecting a category hides the featured section and narrows the grid", async ({ page }) => {
    await page.goto("/news");
    await selectCategory(page, "Announcement");
    await expect(page).toHaveURL(/category=Announcement/);

    await expect(page.getByText("📌 Featured")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: featuredTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Second announcement ${runId}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: searchableTitle })).not.toBeVisible();
  });

  test("searching narrows results, keeps the featured section hidden, and folds a matching post in", async ({
    page,
  }) => {
    await page.goto("/news");
    await page.getByPlaceholder("Search news…").fill(searchableTitle);
    await expect(page).toHaveURL(/q=/);

    await expect(page.getByText("📌 Featured")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: searchableTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Update two ${runId}` })).not.toBeVisible();
  });

  test("shows the Upcoming badge on the Event post", async ({ page }) => {
    await page.goto("/news?category=Event");
    await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible();
    await expect(page.getByText("Upcoming")).toBeVisible();
  });

  test("Load more appends the next batch without losing the active filter", async ({ page }) => {
    await page.goto("/news"); // all categories, no search -- 7 non-featured posts, page size 6
    await expect(page.getByRole("heading", { name: `Patch v2 ${runId}` })).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByRole("link", { name: "Load more" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("heading", { name: `Patch v2 ${runId}` })).toBeVisible();
    // Still no category/search applied -- the featured post is still
    // shown separately, same as page 1.
    await expect(page.getByRole("heading", { name: featuredTitle })).toBeVisible();
  });

  test("shows the empty state, not a blank grid, for a filter/search combination matching nothing", async ({
    page,
  }) => {
    await page.goto("/news?category=Event&q=zzz-no-match");
    await expect(page.getByText("No posts here yet.")).toBeVisible();
  });

});
