import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { hash } from "bcrypt-ts";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const oldPassword = "correcthorse";
const newPassword = "batterystaple99";

const resetEmail = `e2e-pwreset-${runId}@example.com`;
const revokeEmail = `e2e-pwrevoke-${runId}@example.com`;
const bystanderEmail = `e2e-pwbystander-${runId}@example.com`;

let resetUserId: string;
let revokeUserId: string;
let bystanderUserId: string;

async function seedUser(email: string, handle: string) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      handle,
      passwordHash: await hash(oldPassword, 10),
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  return user.id;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/**
 * Mints a link the way the app does and returns the URL.
 *
 * Deliberately NOT scraped from the dev server's console. Locally there's
 * no RESEND_API_KEY so send-email.ts logs the body instead of sending --
 * but that fallback does not exist in production, and a test that reads it
 * would be asserting against a code path real users never touch. Going
 * through the database instead exercises the same rows production uses.
 *
 * The raw token can't be read back (only its SHA-256 is stored, FR-012),
 * so the test generates the raw value and writes the hash itself.
 */
async function issueResetLink(userId: string, expires = new Date(Date.now() + 60 * 60 * 1000)) {
  const rawToken = `${runId}${crypto.randomUUID().replace(/-/g, "")}`.padEnd(64, "0").slice(0, 64);
  // Supersede, exactly as createPasswordResetToken does.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    expires,
    createdAt: new Date(),
  });
  return `/reset-password?token=${rawToken}`;
}

test.beforeAll(async () => {
  resetUserId = await seedUser(resetEmail, `e2epwreset${runId}`);
  revokeUserId = await seedUser(revokeEmail, `e2epwrevoke${runId}`);
  bystanderUserId = await seedUser(bystanderEmail, `e2epwbystand${runId}`);
});

test.afterAll(async () => {
  // Tokens cascade with the user. Scoped to this run's ids only -- never a
  // blanket wipe of a table other specs also use.
  for (const id of [resetUserId, revokeUserId, bystanderUserId]) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// T022 -- the whole reason this feature exists.
test("the login form's 'Forgot password?' link no longer 404s", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("requesting a reset reaches a dead-end that doesn't confirm the address (FR-004)", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(resetEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("heading", { name: "Reset link on its way" })).toBeVisible();
  await expect(page.getByText(/if that address has a playm8z account/i)).toBeVisible();
  // The address itself must not be echoed -- that would confirm it exists.
  await expect(page.getByText(resetEmail)).toHaveCount(0);

  // Prove the request really did something, or the assertions above pass
  // just as well against a form that submits nowhere.
  const rows = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetUserId));
  expect(rows.length).toBeGreaterThan(0);
});

test("an unknown address gets the identical dead-end", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(`e2e-pwnobody-${runId}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Reset link on its way" })).toBeVisible();
  await expect(page.getByText(/if that address has a playm8z account/i)).toBeVisible();
});

// T020 -- the full journey, and the part no unit test can prove: that the
// emailed link actually works in a browser and the old password stops.
test("a real link sets a new password, and the old one stops working", async ({ page }) => {
  const link = await issueResetLink(resetUserId);

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Set new password" }).click();

  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
  // FR-019: still logged out. Scoped to `main` -- SiteHeader carries its
  // own "Log in" link, and an unscoped getByRole matches both.
  await expect(page.getByRole("main").getByRole("link", { name: "Log in" })).toBeVisible();

  // The new password works...
  await login(page, resetEmail, newPassword);
  await page.waitForURL("http://localhost:3000/");

  // ...and the old one does not.
  await page.goto("/api/auth/signout");
  await login(page, resetEmail, oldPassword);
  await expect(page).toHaveURL(/\/login/);
});

test("a used link is refused the second time (FR-010)", async ({ page }) => {
  const link = await issueResetLink(resetUserId);

  await page.goto(link);
  await page.getByLabel("New password").fill("first-new-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);
});

test("an expired link is refused (FR-008)", async ({ page }) => {
  const link = await issueResetLink(resetUserId, new Date(Date.now() - 1000));
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
});

test("a made-up token is refused with the same message (FR-018)", async ({ page }) => {
  await page.goto("/reset-password?token=totally-made-up");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
});

// A dead link says so on ARRIVAL rather than after you've thought up a
// password and typed it in. Checking the token doesn't consume it, so
// there's no cost to being upfront.
test("a dead link is refused on load, without offering the password field first", async ({
  page,
}) => {
  const expired = await issueResetLink(resetUserId, new Date(Date.now() - 1000));
  await page.goto(expired);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);

  // Positive control: a LIVE link must still show the field, or this test
  // also passes against a page that never shows the form at all.
  const live = await issueResetLink(resetUserId);
  await page.goto(live);
  await expect(page.getByLabel("New password")).toBeVisible();
});

// Checking on load must not burn the link -- otherwise a mail scanner or
// browser prefetch following it would destroy the reset before the user
// ever clicks.
test("merely opening a link does not consume it", async ({ page }) => {
  const link = await issueResetLink(resetUserId);
  await page.goto(link);
  await page.goto(link);
  await page.goto(link);

  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
});

test("a missing token is refused without ever showing the form", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);
});

// T021 -- ADR 0010, tested in BOTH directions. A revocation bug that logs
// everyone out passes any test that only checks "the stale session died",
// which is why the bystander half matters as much as the first half.
test("resetting signs out the account's other sessions, and nobody else's", async ({ browser }) => {
  const victimContext = await browser.newContext();
  const bystanderContext = await browser.newContext();
  const victim = await victimContext.newPage();
  const bystander = await bystanderContext.newPage();

  try {
    await login(victim, revokeEmail, oldPassword);
    await victim.waitForURL("http://localhost:3000/");
    await login(bystander, bystanderEmail, oldPassword);
    await bystander.waitForURL("http://localhost:3000/");

    // Positive control: both sessions genuinely work before the reset.
    // Without this, "logged out afterwards" passes even if login never
    // worked at all.
    await victim.goto("/profile");
    await expect(victim).toHaveURL(/\/profile/);
    await bystander.goto("/profile");
    await expect(bystander).toHaveURL(/\/profile/);

    const link = await issueResetLink(revokeUserId);
    const resetter = await browser.newContext();
    const resetPage = await resetter.newPage();
    await resetPage.goto(link);
    await resetPage.getByLabel("New password").fill(newPassword);
    await resetPage.getByRole("button", { name: "Set new password" }).click();
    await expect(resetPage.getByRole("heading", { name: "Password updated" })).toBeVisible();
    await resetter.close();

    // The victim's stale JWT is refused -- on a private READ, not just a
    // write. That distinction is the entire reason ADR 0010 pays for a
    // per-request DB lookup instead of the free writes-only check.
    await victim.goto("/profile");
    await expect(victim).not.toHaveURL(/\/profile$/);

    // ...and the bystander is completely untouched.
    await bystander.goto("/profile");
    await expect(bystander).toHaveURL(/\/profile/);
  } finally {
    await victimContext.close();
    await bystanderContext.close();
  }
});

test("only the newest link works when several were requested (FR-009)", async ({ page }) => {
  const first = await issueResetLink(resetUserId);
  const second = await issueResetLink(resetUserId);

  // The superseded link is dead on arrival -- no password field at all.
  await page.goto(first);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveCount(0);

  // The newest one still works. This half is the positive control: without
  // it, "the old link is dead" also passes if supersede killed both.
  await page.goto(second);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
});

test("the newest stored token is the live one", async () => {
  await issueResetLink(resetUserId);
  const rows = await db
    .select({ usedAt: passwordResetTokens.usedAt, createdAt: passwordResetTokens.createdAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetUserId))
    .orderBy(desc(passwordResetTokens.createdAt));
  expect(rows[0].usedAt).toBeNull();
  expect(rows.slice(1).every((r) => r.usedAt !== null)).toBe(true);
});
