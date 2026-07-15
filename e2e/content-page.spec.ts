import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, users } from "@/db/schema";

// save-content-page.test.ts/toggle-page-status.test.ts already cover
// moderator-or-higher editing logic directly; this spec covers public
// reading (US1, fully real) and confirming a logged-in ordinary user
// sees no edit controls at all and is held to the same draft-404 rule
// as an anonymous visitor. The AI-writing-assist describe block
// further down (028) exercises the inline editor for real through a
// seeded admin/moderator session.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-cp-verified-${runId}@example.com`;

const publishedSlug = `e2e-cp-published-${runId}`;
const draftSlug = `e2e-cp-draft-${runId}`;
const missingSlug = `e2e-cp-missing-${runId}`;

const pageTitle = `Community Guidelines ${runId}`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values({
    email: verifiedEmail,
    passwordHash,
    handle: `e2ecpverified${runId}`,
    emailVerified: new Date(),
  });

  await db.insert(contentPages).values({
    slug: publishedSlug,
    title: pageTitle,
    status: "published",
    blocks: [
      { type: "h2", text: "Be a good teammate" },
      { type: "p", text: "Communicate honestly and show up when you commit." },
      { type: "list", items: ["Be respectful", "Be reliable"] },
      { type: "quote", text: "Play hard, play fair, play together." },
      { type: "callout", text: "Use age-group filters when posting a party." },
      { type: "divider" },
    ],
  });

  await db.insert(contentPages).values({
    slug: draftSlug,
    title: "Draft page",
    status: "draft",
    blocks: [{ type: "p", text: "Not ready yet." }],
  });
});

test.afterAll(async () => {
  await db.delete(contentPages).where(eq(contentPages.slug, publishedSlug));
  await db.delete(contentPages).where(eq(contentPages.slug, draftSlug));
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Content Page (quickstart.md Scenario 1)", () => {
  test("any visitor reads a published page with every block type rendered, no login required", async ({ page }) => {
    await page.goto(`/pages/${publishedSlug}`);
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.getByRole("heading", { name: pageTitle, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Be a good teammate", level: 2 })).toBeVisible();
    await expect(page.getByText("Communicate honestly and show up when you commit.")).toBeVisible();
    await expect(page.getByText("Be respectful")).toBeVisible();
    await expect(page.getByText("Play hard, play fair, play together.")).toBeVisible();
    await expect(page.getByText("Use age-group filters when posting a party.")).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("a nonexistent slug shows the 404 state", async ({ page }) => {
    const response = await page.goto(`/pages/${missingSlug}`);
    expect(response?.status()).toBe(404);
  });

  test("an unpublished (draft) page shows the 404 state to a logged-out visitor, not its content", async ({
    page,
  }) => {
    const response = await page.goto(`/pages/${draftSlug}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Not ready yet.")).not.toBeVisible();
  });

  test("a logged-in but non-moderator user sees no edit controls, and is still 404'd for the draft page", async ({
    page,
  }) => {
    await login(page, verifiedEmail);

    await page.goto(`/pages/${publishedSlug}`);
    await expect(page.getByRole("button", { name: "Edit page" })).not.toBeVisible();

    const response = await page.goto(`/pages/${draftSlug}`);
    expect(response?.status()).toBe(404);
  });
});

test.describe("AI writing assist -- admin-only gate (028, quickstart.md)", () => {
  const adminEmail = `e2e-cp-ai-admin-${runId}@example.com`;
  const modEmail = `e2e-cp-ai-mod-${runId}@example.com`;

  test.beforeAll(async () => {
    const passwordHash = await hash(password, 10);
    await db.insert(users).values([
      { email: adminEmail, passwordHash, handle: `e2ecpaiadmin${runId}`, emailVerified: new Date(), role: "admin" },
      { email: modEmail, passwordHash, handle: `e2ecpaimod${runId}`, emailVerified: new Date(), role: "moderator" },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(users).where(inArray(users.email, [adminEmail, modEmail]));
  });

  test("an admin session sees the 'Write from scratch' control while editing", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto(`/pages/${publishedSlug}`);
    await page.getByRole("button", { name: "Edit page" }).click();

    await expect(page.getByPlaceholder(/short topic/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Write from scratch" })).toBeVisible();
  });

  test("a moderator (not admin) session does not see the control while editing", async ({ page }) => {
    await login(page, modEmail);
    await page.goto(`/pages/${publishedSlug}`);
    await page.getByRole("button", { name: "Edit page" }).click();

    await expect(page.getByPlaceholder(/short topic/)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Write from scratch" })).not.toBeVisible();
  });

  test("an admin sees 'Improve / rewrite' on populated blocks, but not on the empty divider block", async ({
    page,
  }) => {
    await login(page, adminEmail);
    await page.goto(`/pages/${publishedSlug}`);
    await page.getByRole("button", { name: "Edit page" }).click();

    // The seeded page has 5 text-bearing blocks (h2/p/list/quote/callout) plus one divider.
    await expect(page.getByRole("button", { name: "Improve / rewrite", exact: true })).toHaveCount(5);
  });

  test("a moderator sees no 'Improve / rewrite' controls on any block", async ({ page }) => {
    await login(page, modEmail);
    await page.goto(`/pages/${publishedSlug}`);
    await page.getByRole("button", { name: "Edit page" }).click();

    await expect(page.getByRole("button", { name: "Improve / rewrite", exact: true })).toHaveCount(0);
  });
});
