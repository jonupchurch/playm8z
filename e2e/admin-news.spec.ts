import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// `save-news-post.ts`/`get-news-posts.ts` are already covered directly
// by their own unit/integration tests; the access-denial describe
// block below covers FR-001/SC-005 for an unauthenticated visitor and
// a logged-in ordinary user. The AI-writing-assist describe block
// further down (028) exercises the editor for real through a seeded
// admin/moderator session.
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

test.describe("AI writing assist -- admin-only gate (028, quickstart.md)", () => {
  const adminEmail = `e2e-admin-news-ai-admin-${runId}@example.com`;
  const modEmail = `e2e-admin-news-ai-mod-${runId}@example.com`;

  test.beforeAll(async () => {
    const passwordHash = await hash(password, 10);
    await db.insert(users).values([
      { email: adminEmail, passwordHash, handle: `e2eadminnewsai${runId}`, emailVerified: new Date(), role: "admin" },
      { email: modEmail, passwordHash, handle: `e2eadminnewsaimod${runId}`, emailVerified: new Date(), role: "moderator" },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(users).where(inArray(users.email, [adminEmail, modEmail]));
  });

  test("an admin session sees the 'Write from scratch' control on a new post", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/news");
    await expect(page.getByPlaceholder(/short topic/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Write from scratch" })).toBeVisible();
  });

  test("a moderator (not admin) session does not see the control", async ({ page }) => {
    await login(page, modEmail);
    await page.goto("/admin/news");
    await expect(page.getByPlaceholder(/short topic/)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Write from scratch" })).not.toBeVisible();
  });

  test("'Improve / rewrite' is unavailable on an empty body, and appears once text is typed, for an admin", async ({
    page,
  }) => {
    await login(page, adminEmail);
    await page.goto("/admin/news");
    await expect(page.getByRole("button", { name: "Improve / rewrite", exact: true })).not.toBeVisible();

    await page.getByLabel("Body", { exact: true }).fill("An early draft of the announcement.");
    await expect(page.getByRole("button", { name: "Improve / rewrite", exact: true })).toBeVisible();
  });

  test("'Improve / rewrite' never appears for a moderator, even with body text present", async ({ page }) => {
    await login(page, modEmail);
    await page.goto("/admin/news");
    await page.getByLabel("Body", { exact: true }).fill("An early draft of the announcement.");
    await expect(page.getByRole("button", { name: "Improve / rewrite", exact: true })).not.toBeVisible();
  });
});

test.describe("Cover image upload (029, quickstart.md)", () => {
  const modEmail = `e2e-admin-news-cover-mod-${runId}@example.com`;

  test.beforeAll(async () => {
    const passwordHash = await hash(password, 10);
    await db.insert(users).values({
      email: modEmail,
      passwordHash,
      handle: `e2eadminnewscover${runId}`,
      emailVerified: new Date(),
      role: "moderator",
    });
  });

  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, modEmail));
  });

  test("a moderator sees the 'Upload image' control in the Cover section, alongside the gradient swatches", async ({
    page,
  }) => {
    await login(page, modEmail);
    await page.goto("/admin/news");

    await expect(page.getByText("Upload image", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use cover color/ }).first()).toBeVisible();
  });
});
