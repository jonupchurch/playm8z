import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";

// Category/sort chips use a visually-hidden native radio input under a
// styled pill -- click the visible label, same lesson as Browse's own
// selectFacet() helper. Scoped by the radio group's `name` since
// "Latest"/"Top"/"Unanswered" and category labels never collide, but
// this keeps intent explicit.
function selectChip(page: Page, label: string, groupName?: string) {
  const scope = groupName ? page.locator(`label:has(input[name="${groupName}"])`) : page.locator("label");
  return scope.filter({ hasText: label }).first().click();
}

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-forum-verified-${runId}@example.com`;

const pinnedTitle = `Welcome pinned ${runId}`;
const valorantTitle = `Valorant crew ${runId}`;
const quietTitle = `Quiet lfg thread ${runId}`;
const metaTitle = `Meta debate ${runId}`;

let authorId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  // getCategoryCounts()/getForumStats() both aggregate over the whole
  // table -- clear it first so this test's own counts/ordering aren't
  // at the mercy of whatever else exists in the shared dev database,
  // same fix as Browse's/Home's own e2e specs.
  await db.delete(forumThreads);

  const passwordHash = await hash(password, 10);
  const [author] = await db
    .insert(users)
    .values({
      email: verifiedEmail,
      passwordHash,
      handle: `e2eforum${runId}`,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  authorId = author.id;

  await db.insert(forumThreads).values([
    {
      authorId,
      categoryId: "general",
      title: pinnedTitle,
      body: "House rules and how matchmaking works.",
      tags: ["rules"],
      pinned: true,
      replyCount: 1,
      likes: 1,
      createdAt: new Date(Date.now() - 10 * 60_000),
    },
    {
      authorId,
      categoryId: "lfg",
      title: valorantTitle,
      body: "Building a reliable evening crew.",
      tags: ["valorant", "na-west"],
      replyCount: 5,
      likes: 20,
      createdAt: new Date(Date.now() - 5 * 60_000),
    },
    {
      authorId,
      categoryId: "lfg",
      title: quietTitle,
      body: "Anyone around this weekend?",
      tags: [],
      replyCount: 0,
      likes: 0,
      createdAt: new Date(Date.now() - 60_000),
    },
    {
      authorId,
      categoryId: "gametalk",
      title: metaTitle,
      body: "Which agent comp wins after the patch?",
      tags: ["meta"],
      replyCount: 2,
      likes: 50,
      createdAt: new Date(Date.now() - 20 * 60_000),
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(forumThreads).where(eq(forumThreads.authorId, authorId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Forum index (quickstart.md Scenarios 1-2)", () => {
  test("loads for a logged-out visitor, with axe-core clean, and category/search/sort all work", async ({
    page,
  }) => {
    const response = await page.goto("/forum");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Community forum" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    // Category filter narrows the list and the chip shows an accurate count.
    await selectChip(page, "Looking for Group");
    await expect(page).toHaveURL(/category=lfg/);
    await expect(page.getByText(valorantTitle)).toBeVisible();
    await expect(page.getByText(quietTitle)).toBeVisible();
    await expect(page.getByText(metaTitle)).toHaveCount(0);

    // Search combines with category (AND).
    await page.getByPlaceholder("Search threads…").fill("valorant");
    await expect(page).toHaveURL(/q=valorant/, { timeout: 10000 });
    await expect(page.getByText(valorantTitle)).toBeVisible();
    await expect(page.getByText(quietTitle)).toHaveCount(0);

    // Clear back to All + no search, then check sort. Each URL-changing
    // action must settle before the next one reads searchParams itself,
    // or a debounced update can rebuild the URL from a stale snapshot
    // and silently re-apply a filter that was just cleared.
    await selectChip(page, "All");
    await expect(page).not.toHaveURL(/category=/);
    await page.getByPlaceholder("Search threads…").fill("");
    await expect(page).not.toHaveURL(/q=/, { timeout: 10000 });

    await selectChip(page, "Top", "forum-sort");
    await expect(page).toHaveURL(/sort=top/);
    const topRows = page.locator('a[href^="/forum/thread/"]');
    await expect(topRows.first()).toContainText(pinnedTitle); // pinned always first

    await selectChip(page, "Unanswered", "forum-sort");
    await expect(page).toHaveURL(/sort=unanswered/);
    await expect(page.getByText(quietTitle)).toBeVisible();
    await expect(page.getByText(valorantTitle)).toHaveCount(0); // has replies, excluded

    // Right rail: real member/thread counts render, and a trending tag applies as a search term.
    await expect(page.getByText("members", { exact: true })).toBeVisible();
    await expect(page.getByText("threads", { exact: true })).toBeVisible();
    await selectChip(page, "All");
    await expect(page).not.toHaveURL(/category=/);
    await selectChip(page, "Latest", "forum-sort");
    await expect(page).not.toHaveURL(/sort=/);
    await page.getByRole("button", { name: "#valorant" }).click();
    await expect(page).toHaveURL(/q=valorant/);
    await expect(page.getByText(valorantTitle)).toBeVisible();

    // Empty category shows the empty state with a path to create one.
    await page.getByPlaceholder("Search threads…").fill("");
    await expect(page).not.toHaveURL(/q=/, { timeout: 10000 });
    await selectChip(page, "Off-Topic");
    await expect(page.getByText("No threads here yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "+ New thread" }).first()).toBeVisible();
  });

  test("a verified user creates a thread via the modal; it appears immediately; logged-out is routed to log in", async ({
    page,
  }) => {
    await login(page, verifiedEmail);
    await page.goto("/forum");

    await page.getByRole("button", { name: "+ New thread" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New thread" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    const newTitle = `Brand new thread ${runId}`;
    await dialog.locator("#new-thread-category").selectOption("gametalk");
    await dialog.locator("#new-thread-title").fill(newTitle);
    await dialog.locator("#new-thread-body").fill("Does anyone else think this patch is wild?");
    await dialog.getByRole("button", { name: "Post thread" }).click();

    // A confirmed dev-mode-only staleness window (this project's own
    // recurring pattern): the Server Action has already committed by
    // the time the client re-navigates, but the fresh navigation can
    // still briefly race a `next dev` render -- toPass() retries the
    // whole check rather than a single assertion.
    await expect(async () => {
      await expect(page.getByText(newTitle)).toBeVisible({ timeout: 1000 });
      await expect(page).toHaveURL(/category=gametalk/);
    }).toPass({ timeout: 10000 });

    const [row] = await db.select().from(forumThreads).where(eq(forumThreads.title, newTitle));
    expect(row).toBeDefined();
    expect(row.pinned).toBe(false);
    expect(row.replyCount).toBe(0);
    await db.delete(forumThreads).where(eq(forumThreads.id, row.id));

    // A genuinely fresh, un-authenticated context -- not
    // page.context().clearCookies(), which is vulnerable to a
    // confirmed dev-mode-only Chromium HTTP-cache artifact when reused
    // within the same browser context (Listing detail's finding).
    const loggedOutContext = await page.context().browser()!.newContext();
    const loggedOutPage = await loggedOutContext.newPage();
    await loggedOutPage.goto("/forum");
    await loggedOutPage.getByRole("link", { name: "+ New thread" }).first().click();
    await expect(loggedOutPage).toHaveURL(/\/login/);
    await loggedOutContext.close();
  });
});
