import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, users } from "@/db/schema";

// Moderator-or-higher editing (US2/US3) can't be exercised end-to-end
// here: require-role.ts's rank check is currently hardcoded to reject
// every real session (no `role` column exists yet -- Admin Settings/024
// adds it), so no test account, however constructed, can ever pass
// requireRole("moderator") today. save-content-page.test.ts and
// toggle-page-status.test.ts already cover that logic directly (with
// requireRole mocked to simulate a passing check); this spec covers
// what's actually reachable through a real browser today: public
// reading (US1, fully real) and confirming a logged-in ordinary user
// sees no edit controls at all and is held to the same draft-404 rule
// as an anonymous visitor (the real, current behavior of FR-004/FR-003).
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
