import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, newsPosts, savedNewsPosts, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-nad-verified-${runId}@example.com`;
const unverifiedEmail = `e2e-nad-unverified-${runId}@example.com`;

const publishedSlug = `nad-published-${runId}`;
const draftSlug = `nad-draft-${runId}`;
const futureSlug = `nad-future-${runId}`;
const publishedTitle = `Published Article ${runId}`;

const publishedBody = Array(260).fill("word").join(" ") + "\n\n## A heading\n\nMore content here.";

let publishedId: string;
const relatedIds: string[] = [];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db
    .insert(users)
    .values({ email: verifiedEmail, passwordHash, handle: `nadverified${runId}`, emailVerified: new Date() });

  await db.insert(users).values({ email: unverifiedEmail, passwordHash, handle: `nadunverified${runId}` });

  const [published] = await db
    .insert(newsPosts)
    .values({
      title: publishedTitle,
      excerpt: "An excerpt for the published article.",
      category: "Announcement",
      status: "published",
      slug: publishedSlug,
      body: publishedBody,
      tags: ["launch", "beta"],
      cover: "linear-gradient(135deg,#ffb000,#ff6b1a)",
    })
    .returning({ id: newsPosts.id });
  publishedId = published.id;

  await db.insert(newsPosts).values({
    title: `Draft Article ${runId}`,
    excerpt: "e",
    category: "Announcement",
    status: "draft",
    slug: draftSlug,
    body: "draft content",
  });

  await db.insert(newsPosts).values({
    title: `Future Scheduled Article ${runId}`,
    excerpt: "e",
    category: "Announcement",
    status: "scheduled",
    publishedAt: new Date(Date.now() + 7 * 86_400_000),
    slug: futureSlug,
    body: "future content",
  });

  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    const [row] = await db
      .insert(newsPosts)
      .values({
        title: `Related Article ${i} ${runId}`,
        excerpt: `Excerpt ${i}`,
        category: "Update",
        status: "published",
        slug: `nad-related-${i}-${runId}`,
        publishedAt: new Date(now - (i + 1) * 60_000),
        body: "related content",
      })
      .returning({ id: newsPosts.id });
    relatedIds.push(row.id);
  }
});

test.afterAll(async () => {
  await db.delete(likes).where(eq(likes.targetId, publishedId));
  await db.delete(savedNewsPosts).where(eq(savedNewsPosts.newsPostId, publishedId));
  await db.delete(newsPosts).where(eq(newsPosts.slug, publishedSlug));
  await db.delete(newsPosts).where(eq(newsPosts.slug, draftSlug));
  await db.delete(newsPosts).where(eq(newsPosts.slug, futureSlug));
  for (const id of relatedIds) await db.delete(newsPosts).where(eq(newsPosts.id, id));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

test.describe("News Article detail (quickstart.md Scenarios 1-4)", () => {
  test("reads a published article, logged out: meta/title/author/cover/body/tags/related/subscribe, real read time, axe clean", async ({
    page,
  }) => {
    const response = await page.goto(`/news/${publishedSlug}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();
    // "Announcement" legitimately appears twice: the meta-row category
    // badge and the byline's own category subtitle -- not ambiguous to
    // a human (different regions), just to a bare text locator.
    await expect(page.getByText("Announcement", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/\d+ min read/)).toBeVisible();
    await expect(page.getByText("playm8z team")).toBeVisible();
    await expect(page.getByText("A heading")).toBeVisible();
    await expect(page.getByText("#launch")).toBeVisible();
    await expect(page.getByText("#beta")).toBeVisible();
    await expect(page.getByText("Keep reading")).toBeVisible();
    await expect(page.getByText("Never miss an update")).toBeVisible();

    // Real computed read time: 260+ words -> 2 min read, not blank/zero.
    await expect(page.getByText("2 min read")).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("shows the same not-found response for a draft slug, a not-yet-due scheduled slug, and a nonexistent slug", async ({
    page,
  }) => {
    const draftResponse = await page.goto(`/news/${draftSlug}`);
    expect(draftResponse?.status()).toBe(404);

    const futureResponse = await page.goto(`/news/${futureSlug}`);
    expect(futureResponse?.status()).toBe(404);

    const missingResponse = await page.goto(`/news/no-such-article-${runId}`);
    expect(missingResponse?.status()).toBe(404);
  });

  test("the reading-progress bar tracks scroll position", async ({ page }) => {
    await page.goto(`/news/${publishedSlug}`);
    const bar = page.locator("#reading-progress-bar");

    const atTop = await bar.evaluate((el) => (el as HTMLElement).style.width);
    expect(atTop).toBe("0%");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(async () => {
      const width = await bar.evaluate((el) => (el as HTMLElement).style.width);
      expect(width).toBe("100%");
    }).toPass();
  });

  test("Keep reading shows up to 3 other live articles, never the current one", async ({ page }) => {
    await page.goto(`/news/${publishedSlug}`);
    for (let i = 0; i < 3; i++) {
      await expect(page.getByRole("heading", { name: `Related Article ${i} ${runId}` })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: publishedTitle, exact: true })).toHaveCount(1);
  });

  test("share buttons: X/LinkedIn call window.open with the right intent URL, copy-link copies the current URL", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/news/${publishedSlug}`);

    // Stubs window.open to record its arguments instead of actually
    // opening a real popup -- X's own live redirect-to-login chain for
    // an unauthenticated browser is real, external, uncontrollable
    // behavior, not something this feature's own code should be
    // re-verified against on every run.
    await page.evaluate(() => {
      (window as unknown as { __openCalls: string[] }).__openCalls = [];
      window.open = (url) => {
        (window as unknown as { __openCalls: string[] }).__openCalls.push(String(url));
        return null;
      };
    });

    await page.getByRole("button", { name: "Share on X" }).click();
    await page.getByRole("button", { name: "Share on LinkedIn" }).click();

    const openCalls = await page.evaluate(() => (window as unknown as { __openCalls: string[] }).__openCalls);
    expect(openCalls).toHaveLength(2);
    expect(openCalls[0]).toContain("twitter.com/intent/tweet");
    expect(openCalls[0]).toContain(encodeURIComponent(publishedSlug));
    expect(openCalls[1]).toContain("linkedin.com/sharing");
    expect(openCalls[1]).toContain(encodeURIComponent(publishedSlug));

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(publishedSlug);
  });
});

test.describe("News Article detail (quickstart.md Scenarios 5-6, 9)", () => {
  test("Like toggles the count and persists on reload", async ({ page }) => {
    await login(page, verifiedEmail);
    await page.goto(`/news/${publishedSlug}`);

    await page.getByRole("button", { name: /♥ 0/ }).click();
    await expect(page.getByRole("button", { name: /♥ 1/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: /♥ 1/ })).toBeVisible();

    await page.getByRole("button", { name: /♥ 1/ }).click();
    await expect(page.getByRole("button", { name: /♥ 0/ })).toBeVisible();
  });

  test("Save shows Saved and the article appears in Profile's Saved tab", async ({ page }) => {
    await login(page, verifiedEmail);
    await page.goto(`/news/${publishedSlug}`);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

    await page.goto("/profile/saved");
    await expect(page.getByText("Saved articles")).toBeVisible();
    await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();

    await page.getByRole("button", { name: "Unsave this article" }).click();
    await expect(page.getByText("No saved articles yet.")).toBeVisible();
  });

  test("an unauthenticated visitor is routed to log in when attempting Like", async ({ page }) => {
    await page.goto(`/news/${publishedSlug}`);
    await page.getByRole("link", { name: /♥ 0/ }).click();
    await page.waitForURL(/\/login/);
  });

  test("an unverified session sees a verify-your-email message when attempting Save", async ({ page }) => {
    await login(page, unverifiedEmail);
    await page.goto(`/news/${publishedSlug}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/verify your email/i);

    const rows = await db.select().from(savedNewsPosts).where(eq(savedNewsPosts.newsPostId, publishedId));
    expect(rows).toEqual([]);
  });
});
