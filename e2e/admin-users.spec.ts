import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Every lib/admin/*.ts query and Server Action is already covered
// directly by its own unit/integration tests; the access-denial
// describe block below covers FR-001/SC-004 for an unauthenticated
// visitor and a logged-in ordinary user. The drawer-content describe
// block further down (027) exercises the real drawer through a
// seeded moderator session, now that Admin Settings (024) shipped the
// real `role` column.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-admin-users-${runId}@example.com`;

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
    handle: `e2eadminusers${runId}`,
    emailVerified: new Date(),
  });
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Admin Users (quickstart.md Scenario 1, access control)", () => {
  test("an unauthenticated visitor is denied, not shown the user table", async ({ page }) => {
    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("total users")).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("a logged-in but non-moderator user is denied, not shown the user table", async ({ page }) => {
    await login(page, verifiedEmail);

    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("total users")).not.toBeVisible();
  });
});

test.describe("Admin Users drawer -- view full profile in a new tab (027, quickstart.md)", () => {
  const modEmail = `e2e-admin-users-mod-${runId}@example.com`;
  const modHandle = `e2eadminusersmod${runId}`;
  const activeHandle = `e2eadminusersactive${runId}`;
  const bannedHandle = `e2eadminusersbanned${runId}`;
  let activeUserId: string;
  let bannedUserId: string;

  test.beforeAll(async () => {
    const passwordHash = await hash(password, 10);
    await db.insert(users).values([
      { email: modEmail, passwordHash, handle: modHandle, emailVerified: new Date(), role: "moderator" },
      { email: `e2e-admin-users-active-${runId}@example.com`, handle: activeHandle, emailVerified: new Date() },
      { email: `e2e-admin-users-banned-${runId}@example.com`, handle: bannedHandle, emailVerified: new Date(), bannedAt: new Date() },
    ]);
    const targets = await db
      .select({ id: users.id, handle: users.handle })
      .from(users)
      .where(inArray(users.handle, [activeHandle, bannedHandle]));
    activeUserId = targets.find((u) => u.handle === activeHandle)!.id;
    bannedUserId = targets.find((u) => u.handle === bannedHandle)!.id;
  });

  test.afterAll(async () => {
    await db.delete(users).where(inArray(users.handle, [modHandle, activeHandle, bannedHandle]));
  });

  test("shows a 'View full profile' link to the target's real public profile, opened in a new tab, for an active user", async ({
    page,
  }) => {
    await login(page, modEmail);
    await page.goto(`/admin/users?userId=${activeUserId}`);

    const link = page.getByRole("link", { name: "View full profile" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `/u/${activeHandle}`);
    await expect(link).toHaveAttribute("target", "_blank");
    const rel = await link.getAttribute("rel");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  test("the control is still present, unhidden, for a banned user", async ({ page }) => {
    await login(page, modEmail);
    await page.goto(`/admin/users?userId=${bannedUserId}`);

    const link = page.getByRole("link", { name: "View full profile" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `/u/${bannedHandle}`);
  });
});
