import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// The list/editor content (US1/US2/US3) can't be exercised end-to-end
// here: require-role.ts's rank check is currently hardcoded to reject
// every real session (no `role` column exists yet -- Admin
// Settings/024 adds it), the exact same gap every prior admin feature
// hits. `save-news-post.ts` and `get-news-posts.ts` are already
// covered directly by their own unit/integration tests; this spec
// covers what's actually reachable through a real browser today:
// FR-001/SC-005's access-denial behavior for both an unauthenticated
// visitor and a logged-in ordinary user.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-admin-news-${runId}@example.com`;

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
    handle: `e2eadminnews${runId}`,
    emailVerified: new Date(),
  });
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Admin News (quickstart.md Scenario 10, access control)", () => {
  test("an unauthenticated visitor is denied, not shown the post list/editor", async ({ page }) => {
    const response = await page.goto("/admin/news");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("News feed", { exact: true })).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("a logged-in but non-moderator user is denied, not shown the post list/editor", async ({ page }) => {
    await login(page, verifiedEmail);

    const response = await page.goto("/admin/news");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("News feed", { exact: true })).not.toBeVisible();
  });
});
