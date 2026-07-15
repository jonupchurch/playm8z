import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, settings, users } from "@/db/schema";

// The running dev server's get-settings.ts cache has a ~5s TTL
// (research.md #2, same as maintenance.spec.ts) -- these waits reflect
// that real, accepted staleness rather than working around it.
const CACHE_TTL_WAIT_MS = 5500;

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";

const adminEmail = `e2e-admin-settings-${runId}@example.com`;
const moderatorEmail = `e2e-admin-settings-mod-${runId}@example.com`;
const promoteEmail = `e2e-admin-settings-promote-${runId}@example.com`;
const privacyOwnerHandle = `e2easprivate${runId}`;
const privacyOwnerEmail = `e2e-admin-settings-private-${runId}@example.com`;

let promoteId: string;
let adminId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

// Every toggle switch's real `<input type="checkbox">` is visually
// hidden (`sr-only`, Profile's own privacy-toggles.tsx precedent) --
// Playwright can't click a zero-size element, so click the enclosing
// (visible) <label> instead, same as e2e/profile.spec.ts's own
// established fix for this exact markup pattern.
function toggleLabel(page: Page, name: string) {
  return page.locator("label").filter({ has: page.getByRole("checkbox", { name }) });
}

// `drizzle-kit push` never runs a migration file's own seed INSERTs
// (e2e/maintenance.spec.ts first found this) -- insert the singleton
// row if missing rather than assuming an UPDATE finds a target.
async function resetSettingsRow() {
  const defaults = {
    maintenanceMode: false,
    maintenanceMessage: null,
    openSignups: true,
    discoverableByDefault: true,
  };
  const [row] = await db.select().from(settings).limit(1);
  if (row) await db.update(settings).set(defaults).where(eq(settings.id, row.id));
  else await db.insert(settings).values(defaults);
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values([
    { email: adminEmail, passwordHash, handle: `e2easadmin${runId}`, emailVerified: new Date(), role: "admin" },
    { email: moderatorEmail, passwordHash, handle: `e2easmod${runId}`, emailVerified: new Date(), role: "moderator" },
    { email: promoteEmail, passwordHash, handle: `e2easpromote${runId}`, emailVerified: new Date() },
    {
      email: privacyOwnerEmail,
      passwordHash,
      handle: privacyOwnerHandle,
      emailVerified: new Date(),
      region: "na-west",
      ageGroup: "18",
      privacyShowRegion: false,
      privacyShowAge: false,
    },
  ]);
  const [promote] = await db.select({ id: users.id }).from(users).where(eq(users.email, promoteEmail));
  promoteId = promote.id;
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail));
  adminId = admin.id;

  await resetSettingsRow();
});

test.afterAll(async () => {
  await db.delete(auditEntries).where(eq(auditEntries.targetId, promoteId));
  await db.delete(auditEntries).where(eq(auditEntries.actorId, adminId));
  await db.delete(users).where(eq(users.email, adminEmail));
  await db.delete(users).where(eq(users.email, moderatorEmail));
  await db.delete(users).where(eq(users.email, promoteEmail));
  await db.delete(users).where(eq(users.email, privacyOwnerEmail));
  await resetSettingsRow();
});

test.describe("Admin Settings access control (FR-001)", () => {
  test("an unauthenticated visitor is denied", async ({ page }) => {
    const response = await page.goto("/admin/settings");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("a logged-in moderator (not admin) is denied -- the stricter-than-moderator gate", async ({ page }) => {
    await login(page, moderatorEmail);
    const response = await page.goto("/admin/settings");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("an admin session sees the Settings page, axe clean", async ({ page }) => {
    await login(page, adminEmail);
    const response = await page.goto("/admin/settings");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "General" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });
});

test.describe("General settings & maintenance mode (Scenarios 2-3, 12)", () => {
  test("general fields persist across a reload, and the save logs an audit entry", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");

    await page.getByLabel("Site name").fill(`Renamed ${runId}`);
    await page.getByLabel("Tagline").fill("New tagline");
    await page.getByRole("button", { name: "Light" }).click();
    await page.getByRole("tabpanel").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Site name")).toHaveValue(`Renamed ${runId}`);
    await expect(page.getByLabel("Tagline")).toHaveValue("New tagline");
    await expect(page.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");

    const entries = await db.select().from(auditEntries).where(eq(auditEntries.actorId, adminId));
    expect(entries.some((entry) => entry.action === "updated general settings")).toBe(true);
  });

  test("maintenance mode: real sitewide effect for a non-admin visitor, admin session unaffected, restores on toggle-off", async ({
    page,
    browser,
  }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");

    await toggleLabel(page, "Maintenance mode").click();
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);

    try {
      // The admin session itself keeps full, normal access to a
      // non-admin route while maintenance is on (proxy.ts's own
      // amendment here).
      const adminHome = await page.goto("/");
      expect(adminHome?.status()).not.toBe(503);

      // A separate, non-admin session sees the maintenance page. /login
      // is exempt (proxy.ts's own amendment) so the form itself still
      // loads, but the post-login redirect chain (/continue -> /) is
      // NOT exempt for a non-admin -- it correctly lands on the
      // maintenance page too, just still nominally at that URL (a
      // rewrite, not a redirect), so this can't reuse the shared
      // login() helper's own waitForURL("/") expectation.
      const plainContext = await browser.newContext();
      const plainPage = await plainContext.newPage();
      await plainPage.goto("/login");
      await plainPage.getByLabel("Email").fill(moderatorEmail);
      await plainPage.getByLabel("Password").fill(password);
      await plainPage.getByRole("button", { name: "Log in" }).click();
      await plainPage.waitForURL((url) => url.pathname !== "/login");
      const plainHome = await plainPage.goto("/");
      expect(plainHome?.status()).toBe(503);
      await expect(plainPage.getByRole("heading", { name: "We're re-rolling the servers" })).toBeVisible();
      await plainContext.close();
    } finally {
      // Toggle back off -- normal access resumes for everyone. In a
      // `finally` so a mid-test assertion failure never leaves
      // maintenance mode stuck on for every other test in this file.
      await page.goto("/admin/settings");
      await toggleLabel(page, "Maintenance mode").click();
      await page.waitForTimeout(CACHE_TTL_WAIT_MS);
    }

    const restoredContext = await browser.newContext();
    const restoredPage = await restoredContext.newPage();
    const restoredResponse = await restoredPage.goto("/");
    expect(restoredResponse?.status()).not.toBe(503);
    await restoredContext.close();
  });
});

test.describe("Moderation & auto-flag settings (Scenarios 4-6, persistence)", () => {
  // Runs regardless of the test's own outcome -- a mid-test assertion
  // failure must never leave these fields corrupted for whichever e2e
  // spec/test happens to run next against this same shared dev database.
  test.afterEach(async () => {
    const [row] = await db.select().from(settings).limit(1);
    if (row) {
      await db
        .update(settings)
        .set({
          boostFilterEnabled: true,
          bannedPhrases: ["free nitro", "cheap boosting", "click here", "dm for rates", "gift-nitro"],
          autoHideEnabled: false,
          autoHideThreshold: 3,
          autoEscalateSeverity: "high",
        })
        .where(eq(settings.id, row.id));
    }
  });

  test("banned phrases, filter toggles, auto-hide threshold, and escalate severity all persist across a reload", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Moderation" }).click();

    await page.getByLabel("Add a banned phrase").fill(`test-phrase-${runId}`);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(`test-phrase-${runId}`)).toBeVisible();

    await toggleLabel(page, "Boosting-keyword filter").click();

    await page.getByRole("button", { name: "Increase auto-hide threshold" }).click();
    await toggleLabel(page, "Enable auto-hide").click();
    await page.getByRole("button", { name: "Medium+" }).click();

    await page.getByRole("tabpanel").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "Moderation" }).click();
    await expect(page.getByText(`test-phrase-${runId}`)).toBeVisible();
    await expect(page.getByLabel("Boosting-keyword filter")).not.toBeChecked();
    await expect(page.getByLabel("Enable auto-hide")).toBeChecked();
    await expect(page.getByRole("button", { name: "Medium+" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Roles & access (Scenarios 7-8)", () => {
  test("a role change takes effect on the promoted user's next request; removing reverts to plain user", async ({ page, browser }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Roles & access" }).click();

    // promoteEmail starts as a plain `user` -- get-team.ts only lists
    // role >= support, so they have no row/dropdown yet. Granting a
    // first role goes through "Invite a team member" by email
    // (research.md #6) -- the same assignTeamRole action a row's own
    // dropdown calls, just reached via email lookup instead of userId.
    await page.getByLabel("Email").fill(promoteEmail);
    await page.getByLabel("Role", { exact: true }).selectOption("moderator");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByLabel(new RegExp(`Role for @e2easpromote${runId}`))).toHaveValue("moderator");

    // Real effect: the promoted user can now reach a moderator-gated page.
    const promotedContext = await browser.newContext();
    const promotedPage = await promotedContext.newPage();
    await login(promotedPage, promoteEmail);
    const promotedResponse = await promotedPage.goto("/admin/users");
    expect(promotedResponse?.status()).toBe(200);
    await promotedContext.close();

    // Remove -- reverts to the base `user` tier, never a ban/deletion.
    await page.getByRole("button", { name: new RegExp(`Remove @e2easpromote${runId} from the team`) }).click();
    await expect(page.getByText(`@e2easpromote${runId}`)).toHaveCount(0);

    const [row] = await db.select({ role: users.role, bannedAt: users.bannedAt }).from(users).where(eq(users.id, promoteId));
    expect(row.role).toBe("user");
    expect(row.bannedAt).toBeNull();

    const revokedContext = await browser.newContext();
    const revokedPage = await revokedContext.newPage();
    await login(revokedPage, promoteEmail);
    const revokedResponse = await revokedPage.goto("/admin/users");
    expect(revokedResponse?.status()).toBe(403);
    await revokedContext.close();
  });

  test("invite by email: an existing account updates directly; a nonexistent email shows a clear message", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Roles & access" }).click();

    await page.getByLabel("Email").fill(`no-such-account-${runId}@example.com`);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(/no account found/i)).toBeVisible();

    await page.getByLabel("Email").fill(moderatorEmail);
    await page.getByLabel("Role", { exact: true }).selectOption("admin");
    await expect(page.getByLabel("Role", { exact: true })).toHaveValue("admin");
    await page.getByRole("button", { name: "Send invite" }).click();
    // `.click()` only waits for the click event, not the resulting async
    // Server Action -- wait for the component's own success signal
    // (settings-roles.tsx clears the input on success) before querying.
    await expect(page.getByLabel("Email")).toHaveValue("");

    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.email, moderatorEmail));
    expect(row.role).toBe("admin");

    // Restore, so the access-control gate test's own assumption (a
    // plain moderator) stays true for any later run in this suite.
    await db.update(users).set({ role: "moderator" }).where(eq(users.email, moderatorEmail));
  });
});

test.describe("Feature flags & safety (Scenarios 9-11)", () => {
  test("Open Signups off rejects a new sign-up but leaves existing logins unaffected", async ({ page, browser }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Features" }).click();
    await toggleLabel(page, "Open signups").click();
    await page.getByRole("tabpanel").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);

    const signupContext = await browser.newContext();
    const signupPage = await signupContext.newPage();
    await signupPage.goto("/signup");
    await signupPage.getByLabel("Username").fill(`closedsignup${runId}`);
    await signupPage.getByLabel("Email").fill(`e2e-closed-signup-${runId}@example.com`);
    await signupPage.getByLabel("Password").fill(password);
    await signupPage.getByRole("button", { name: "Create account" }).click();
    await expect(signupPage.locator('p[role="alert"]')).toContainText(/temporarily closed/i);
    await signupContext.close();

    // Existing logins are wholly unaffected.
    const loginContext = await browser.newContext();
    const loginPage = await loginContext.newPage();
    await login(loginPage, adminEmail);
    await expect(loginPage).toHaveURL("http://localhost:3000/");
    await loginContext.close();

    // Restore.
    await page.reload();
    await page.getByRole("tab", { name: "Features" }).click();
    await toggleLabel(page, "Open signups").click();
    await page.getByRole("tabpanel").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  });

  test("Discoverable-by-default off initializes a brand-new account's own preference to false", async ({ page, browser }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Safety" }).click();
    await toggleLabel(page, "Discoverable profiles by default").click();
    await page.getByRole("tabpanel").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);

    const email = `e2e-discoverable-default-${runId}@example.com`;
    const signupContext = await browser.newContext();
    const signupPage = await signupContext.newPage();
    await signupPage.goto("/signup");
    await signupPage.getByLabel("Username").fill(`e2adiscdef${runId}`);
    await signupPage.getByLabel("Email").fill(email);
    await signupPage.getByLabel("Password").fill(password);
    await signupPage.getByRole("button", { name: "Create account" }).click();
    await expect(signupPage.getByRole("heading", { name: "Welcome! Let's set you up" })).toBeVisible();
    await signupContext.close();

    const [row] = await db.select({ privacyDiscoverable: users.privacyDiscoverable }).from(users).where(eq(users.email, email));
    expect(row.privacyDiscoverable).toBe(false);
    await db.delete(users).where(eq(users.email, email));
  });

  test("Public Profile (022) now honors showRegion/showAgeGroup -- the real gap fix (research.md #7)", async ({ page }) => {
    const response = await page.goto(`/u/${privacyOwnerHandle}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("REGION")).toHaveCount(0);
    await expect(page.getByText("AGE GROUP")).toHaveCount(0);
  });
});
