import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// The table's content/actions (US1/US2/US3) can't be exercised end-to-
// end here: require-role.ts's rank check is currently hardcoded to
// reject every real session (no `role` column exists yet -- Admin
// Settings/024 adds it), the exact same gap every prior admin feature
// hits. `search-content-pages.ts`, `create-content-page.ts`, and
// `delete-content-page.ts` are already covered directly by their own
// unit/integration tests; this spec covers what's actually reachable
// through a real browser today: FR-001/SC-005's access-denial behavior
// for both an unauthenticated visitor and a logged-in ordinary user.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-admin-content-pages-${runId}@example.com`;

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
    handle: `e2eadmincp${runId}`,
    emailVerified: new Date(),
  });
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Admin Content Pages (quickstart.md Scenario 8, access control)", () => {
  test("an unauthenticated visitor is denied, not shown the page list", async ({ page }) => {
    const response = await page.goto("/admin/content-pages");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("Content pages", { exact: true })).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("a logged-in but non-moderator user is denied, not shown the page list", async ({ page }) => {
    await login(page, verifiedEmail);

    const response = await page.goto("/admin/content-pages");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("Content pages", { exact: true })).not.toBeVisible();
  });
});
