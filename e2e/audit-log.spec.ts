import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, contentPages, newsPosts, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const moderatorEmail = `e2e-audit-log-mod-${runId}@example.com`;
const plainEmail = `e2e-audit-log-plain-${runId}@example.com`;

let moderatorId: string;
const entryIds: string[] = [];
const extraEntryIds: string[] = [];
const newsPostSlugs: string[] = [];
const contentPageSlug = `cp-gap-fix-${runId}`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values([
    { email: moderatorEmail, passwordHash, handle: `e2eauditlogmod${runId}`, emailVerified: new Date(), role: "moderator" },
    { email: plainEmail, passwordHash, handle: `e2eauditlogplain${runId}`, emailVerified: new Date() },
  ]);
  const [moderator] = await db.select({ id: users.id }).from(users).where(eq(users.email, moderatorEmail));
  moderatorId = moderator.id;

  // Real timestamps across Today/Yesterday/Earlier (research.md #4) --
  // every action/targetLabel embeds runId so a search on it scopes
  // results to exactly these seeded rows, regardless of whatever else
  // already exists in this shared, append-only, never-wiped audit table.
  const today = new Date(Date.now() - 60 * 60 * 1000);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const earlier = new Date();
  earlier.setDate(earlier.getDate() - 6);

  const rows = await db
    .insert(auditEntries)
    .values([
      {
        actorId: moderatorId,
        action: `removed a posting ${runId}`,
        category: "moderation",
        targetType: "posting",
        targetLabel: `Spam post ${runId}`,
        reason: `Repeated boosting ads ${runId}`,
        meta: { Rule: `Auto-flag threshold ${runId}` },
        createdAt: today,
      },
      {
        actorId: moderatorId,
        action: `published a news post ${runId}`,
        category: "content",
        targetType: "newsPost",
        targetLabel: `Launch post ${runId}`,
        createdAt: yesterday,
      },
      {
        actorId: null,
        action: `auto-hid a posting ${runId}`,
        category: "system",
        targetType: "posting",
        targetLabel: `Hidden post ${runId}`,
        createdAt: earlier,
      },
    ])
    .returning({ id: auditEntries.id });
  entryIds.push(...rows.map((row) => row.id));

  await db.insert(contentPages).values({ slug: contentPageSlug, title: `CP gap fix ${runId}`, status: "draft", blocks: [] });
});

test.afterAll(async () => {
  await db.delete(auditEntries).where(inArray(auditEntries.id, entryIds));
  await db.delete(auditEntries).where(inArray(auditEntries.id, extraEntryIds));
  // The real news post this spec's own gap-fix test publishes must not
  // linger in the shared, unscoped `newsPosts` table -- News Article
  // detail's (023) own "Keep reading" query ranks by recency across the
  // WHOLE table with no per-test scoping, so a leftover published row
  // here can silently displace another spec's expected top-3 result.
  for (const slug of newsPostSlugs) await db.delete(newsPosts).where(eq(newsPosts.slug, slug));
  await db.delete(contentPages).where(eq(contentPages.slug, contentPageSlug));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  await db.delete(users).where(eq(users.email, plainEmail));
});

test.describe("Access control (FR-001, Scenario 4)", () => {
  test("an unauthenticated visitor is denied", async ({ page }) => {
    const response = await page.goto("/admin/audit-log");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("a logged-in non-moderator is denied", async ({ page }) => {
    await login(page, plainEmail);
    const response = await page.goto("/admin/audit-log");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("a moderator (not just an admin) can view the log, axe clean", async ({ page }) => {
    await login(page, moderatorEmail);
    const response = await page.goto("/admin/audit-log");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });
});

test.describe("Browse, search, filter, day-grouping (US1, Scenarios 1-3, 5)", () => {
  test("day-grouped entries show actor (or System), action, target, and category; search narrows", async ({ page }) => {
    await login(page, moderatorEmail);
    await page.goto("/admin/audit-log");

    await page.getByLabel("Search actor, action, target, or reason").fill(runId);
    await expect(page.getByText("Today", { exact: true })).toBeVisible();
    await expect(page.getByText("Yesterday", { exact: true })).toBeVisible();
    await expect(page.getByText("Earlier", { exact: true })).toBeVisible();

    await expect(page.getByRole("button", { name: new RegExp(`Spam post ${runId}`) })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`Hidden post ${runId}`) })).toContainText("System");
  });

  test("actor and category filters narrow, combined with search", async ({ page }) => {
    await login(page, moderatorEmail);
    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(runId);
    // The search box is debounced (300ms) -- wait for its own
    // router.push() to land (Forum index's own lesson: clicking a
    // second URL-updating control before the first settles can read a
    // stale searchParams snapshot) before clicking a category chip.
    await expect(page).toHaveURL(new RegExp(`q=${runId}`));

    await page.getByRole("button", { name: "Moderation", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(`Spam post ${runId}`) })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`Launch post ${runId}`) })).toHaveCount(0);

    await page.getByRole("button", { name: "All", exact: true }).click();
    // Wait for the category reset's own re-render to settle (Forum
    // index's own lesson: two quick URL-updating interactions in a row
    // can let the second read a stale searchParams snapshot) before
    // driving the actor select.
    await expect(page.getByRole("button", { name: new RegExp(`Launch post ${runId}`) })).toBeVisible();

    await page.getByLabel("Filter by actor").selectOption("system");
    await expect(page.getByRole("button", { name: new RegExp(`Hidden post ${runId}`) })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`Spam post ${runId}`) })).toHaveCount(0);
  });

  test("a filter combination matching nothing shows the empty state", async ({ page }) => {
    await login(page, moderatorEmail);
    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(`${runId}-zzz-no-match`);
    await expect(page.getByText("No log entries match those filters.")).toBeVisible();
  });
});

test.describe("Expand/collapse and CSV export (US2, Scenarios 6-7)", () => {
  test("expanding an entry shows its reason and meta; collapsing hides them again", async ({ page }) => {
    await login(page, moderatorEmail);
    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(runId);
    await expect(page).toHaveURL(new RegExp(`q=${runId}`));
    await page.getByRole("button", { name: "Moderation", exact: true }).click();

    const row = page.getByRole("button", { name: new RegExp(`Spam post ${runId}`) });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(`Repeated boosting ads ${runId}`)).toBeVisible();
    await expect(page.getByText(`Auto-flag threshold ${runId}`)).toBeVisible();

    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText(`Repeated boosting ads ${runId}`)).not.toBeVisible();
  });

  test("Export CSV mirrors the active filter exactly", async ({ page }) => {
    await login(page, moderatorEmail);
    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(runId);
    await expect(page).toHaveURL(new RegExp(`q=${runId}`));
    await page.getByRole("button", { name: "Moderation", exact: true }).click();
    // `.click()` only waits for the dispatched event, not the resulting
    // router.push()/server re-render -- wait for the filter's own
    // observable effect (the Content-category row disappearing) before
    // reading the export link's href, which is recomputed from that
    // same re-render.
    await expect(page.getByRole("button", { name: new RegExp(`Launch post ${runId}`) })).toHaveCount(0);

    const exportLink = page.getByRole("link", { name: /Export CSV/ });
    const href = await exportLink.getAttribute("href");
    expect(href).toBeTruthy();

    const response = await page.request.get(href!);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const body = await response.text();
    expect(body).toContain(`Spam post ${runId}`);
    expect(body).not.toContain(`Launch post ${runId}`);
    expect(body).not.toContain(`Hidden post ${runId}`);
  });
});

test("viewing and filtering the log never writes a new audit entry itself (FR-008, Scenario 10)", async ({ page }) => {
  const before = await db.select({ id: auditEntries.id }).from(auditEntries);

  await login(page, moderatorEmail);
  await page.goto("/admin/audit-log");
  await page.getByLabel("Search actor, action, target, or reason").fill(runId);
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.reload();

  const after = await db.select({ id: auditEntries.id }).from(auditEntries);
  expect(after.length).toBe(before.length);
});

test.describe("Gap fix: Admin News and Admin Content Pages now log (US3, Scenarios 8-9)", () => {
  test("publishing via Admin News produces a visible content-category entry", async ({ page }) => {
    const title = `News gap fix ${runId}`;
    await login(page, moderatorEmail);
    await page.goto("/admin/news");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Excerpt").fill("Testing the audit-log gap fix.");
    await page.getByRole("button", { name: "Publish now" }).click();
    // `.click()` only waits for the dispatched event, not the awaited
    // Server Action -- wait for the editor's own success signal (the
    // primary button relabeling to "Update" once the post is loaded as
    // already-published) rather than "Published" text, which is
    // ambiguous here (also a list filter-chip label and a per-row
    // status badge).
    await expect(page.getByRole("button", { name: "Update", exact: true })).toBeVisible();

    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(title);
    const newsRow = page.getByRole("button", { name: new RegExp(title) });
    await expect(newsRow).toBeVisible();
    await expect(newsRow).toContainText("Content");

    const [entry] = await db
      .select({ id: auditEntries.id })
      .from(auditEntries)
      .where(eq(auditEntries.targetLabel, title));
    extraEntryIds.push(entry.id);

    const [post] = await db.select({ slug: newsPosts.slug }).from(newsPosts).where(eq(newsPosts.title, title));
    newsPostSlugs.push(post.slug);
  });

  test("publishing a page via Admin Content Pages produces a visible content-category entry", async ({ page }) => {
    const title = `CP gap fix ${runId}`;
    await login(page, moderatorEmail);
    await page.goto("/admin/content-pages");
    await page.getByLabel("Search pages or URLs").fill(title);
    // The search box is debounced (300ms) then server-filtered via a
    // router.push -- merely seeing `title` appear doesn't prove the
    // list narrowed (this page's own unfiltered fetch already includes
    // it). Wait for the URL to reflect the debounced query, then for
    // exactly one matching action button to remain, before clicking.
    await expect(page).toHaveURL(new RegExp(runId));
    // {exact:true} -- non-exact substring matching would also hit the
    // "Published" filter chip, which is always rendered regardless of
    // the search box's own narrowing.
    const publishButton = page.getByRole("button", { name: "Publish", exact: true });
    await expect(publishButton).toHaveCount(1);
    await publishButton.click();
    // Same "wait for a real success signal, not the click event" rule --
    // "Published" is ambiguous here (also a list filter-chip label), so
    // wait for the row's own action button flipping to "Unpublish".
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

    await page.goto("/admin/audit-log");
    await page.getByLabel("Search actor, action, target, or reason").fill(title);
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();

    const [entry] = await db
      .select({ id: auditEntries.id })
      .from(auditEntries)
      .where(eq(auditEntries.targetLabel, title));
    extraEntryIds.push(entry.id);
  });
});
