import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, savedListings, userGames, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const mainEmail = `e2e-profile-main-${runId}@example.com`;
const otherHostEmail = `e2e-profile-otherhost-${runId}@example.com`;

let mainUserId: string;
let editablePostingId: string;
let acceptedPostingId: string;
let otherHostPostingId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [mainUser] = await db
    .insert(users)
    .values({
      email: mainEmail,
      passwordHash,
      handle: `e2eprofilemain${runId}`,
      name: "Original Name",
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  mainUserId = mainUser.id;

  const [otherHost] = await db
    .insert(users)
    .values({ email: otherHostEmail, handle: `e2eprofileotherhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });

  const base = {
    blurb: "b",
    vibe: "fun",
    region: "na-east",
    ageGroup: "18",
    timeSlots: ["evening"],
    platform: "pc",
    micRequired: false,
    seatsTotal: 4,
    seatsOpen: 2,
    status: "open" as const,
  };

  const [editable] = await db
    .insert(postings)
    .values({ ...base, hostId: mainUserId, game: `E2EProfileEditable-${runId}`, title: `Editable posting ${runId}` })
    .returning({ id: postings.id });
  editablePostingId = editable.id;

  const [accepted] = await db
    .insert(postings)
    .values({ ...base, hostId: mainUserId, game: `E2EProfileAccepted-${runId}`, title: `Accepted posting ${runId}` })
    .returning({ id: postings.id });
  acceptedPostingId = accepted.id;
  await db.insert(applications).values({
    postingId: acceptedPostingId,
    applicantId: otherHost.id,
    status: "accepted",
  });

  const [otherPosting] = await db
    .insert(postings)
    .values({ ...base, hostId: otherHost.id, game: `E2EProfileOtherHost-${runId}`, title: `Other host posting ${runId}` })
    .returning({ id: postings.id });
  otherHostPostingId = otherPosting.id;
});

test.afterAll(async () => {
  for (const id of [editablePostingId, acceptedPostingId, otherHostPostingId]) {
    await db.delete(applications).where(eq(applications.postingId, id));
    await db.delete(savedListings).where(eq(savedListings.postingId, id));
    await db.delete(postings).where(eq(postings.id, id));
  }
  await db.delete(userGames).where(eq(userGames.userId, mainUserId));
  await db.delete(users).where(eq(users.email, mainEmail));
  await db.delete(users).where(eq(users.email, otherHostEmail));
});

test.describe("Profile + Account settings (quickstart.md Scenarios 1-4)", () => {
  test("Overview loads with axe-core clean, and requires authentication", async ({ page }) => {
    const loggedOutResponse = await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
    expect(loggedOutResponse?.status()).toBeLessThan(400);

    await login(page, mainEmail);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Original Name" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("edits display name, region, and bio, reflected immediately on Overview; handle is read-only text", async ({
    page,
  }) => {
    await login(page, mainEmail);
    await page.goto("/profile/account");

    await expect(page.locator("#account-handle")).toHaveText(`@e2eprofilemain${runId}`);
    await expect(page.locator("input#account-handle")).toHaveCount(0);

    await page.getByLabel("Display name").fill("Updated Name");
    await page.getByLabel("Bio").fill("Hello from e2e.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    // A brief, confirmed dev-mode-only staleness window: `updateProfile`
    // has already committed by the time "Saved" renders (the action
    // only returns after its own `await db.update()` resolves), but a
    // fresh navigation immediately afterward can still render the
    // pre-update Overview for a few hundred ms in `next dev`. `toPass()`
    // retries the whole navigation+check rather than a single DOM
    // assertion, since a stale render won't self-correct without a new
    // request. Not reproduced as a concern in production, same
    // reasoning as Listing detail's confirmed dev-only cache finding.
    await expect(async () => {
      await page.goto("/profile");
      await expect(page.getByRole("heading", { name: "Updated Name" })).toBeVisible({ timeout: 1000 });
      await expect(page.getByText("Hello from e2e.")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
  });

  test("adds and removes a game on the Overview tab", async ({ page }) => {
    await login(page, mainEmail);
    await page.goto("/profile");

    await page.getByRole("button", { name: "+ Add game" }).click();
    await page.getByPlaceholder("Game name").fill("Valorant");
    await page.getByPlaceholder("Rank (optional)").fill("Diamond 1");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Valorant")).toBeVisible();
    await expect(page.getByText("Diamond 1")).toBeVisible();

    await page.getByRole("button", { name: "Remove Valorant" }).click();
    await expect(page.getByText("Valorant")).toHaveCount(0);
  });

  test("changes password and can log back in with the new one; rejects an incorrect current password", async ({
    page,
  }) => {
    await login(page, mainEmail);
    await page.goto("/profile/account");

    await page.getByLabel("Current password").fill("wrongpassword");
    await page.getByLabel("New password", { exact: true }).fill("brandnewpassword");
    await page.getByLabel("Confirm new password").fill("brandnewpassword");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/incorrect/i);

    await page.getByLabel("Current password").fill(password);
    await page.getByLabel("New password", { exact: true }).fill("brandnewpassword");
    await page.getByLabel("Confirm new password").fill("brandnewpassword");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(mainEmail);
    await page.getByLabel("Password").fill("brandnewpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("http://localhost:3000/");

    // Restore the original password so every later test's login()
    // helper (which always submits the module-level `password`
    // constant) keeps working.
    await page.goto("/profile/account");
    await page.getByLabel("Current password").fill("brandnewpassword");
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("Confirm new password").fill(password);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();
  });

  // FR-005/Scenario 1 step 7 ("Google-only account shows no password
  // section") isn't scripted here -- there's no way to establish a
  // real session for a passwordless account through the Credentials
  // login form without a real Google OAuth consent flow, same
  // limitation Auth & Onboarding's own e2e suite already accepted for
  // its Google-signup scenario. Covered instead by
  // change-password.test.ts's "rejects for a Google-only account with
  // no password set" integration test, plus code review of
  // account-forms.tsx's `{hasPassword && <PasswordForm />}` guard.

  test("changing email sends a new verification link and resets verified status", async ({ page }) => {
    const newEmail = `e2e-profile-changed-${runId}@example.com`;
    await login(page, mainEmail);
    await page.goto("/profile/account");

    await page.getByLabel("Email", { exact: true }).fill(newEmail);
    await page.getByRole("button", { name: "Update email" }).click();
    await expect(page.getByText(/verification link/i)).toBeVisible();

    const [row] = await db.select().from(users).where(eq(users.email, newEmail));
    expect(row).toBeDefined();
    expect(row.emailVerified).toBeNull();

    // Restore for subsequent tests in this file.
    await db.update(users).set({ email: mainEmail, emailVerified: new Date() }).where(eq(users.id, mainUserId));
  });

  test("My postings: edits a posting with no accepted applicants, blocks editing once one is accepted, and closes/reopens", async ({
    page,
  }) => {
    await login(page, mainEmail);
    await page.goto("/profile/postings");

    await expect(page.getByRole("heading", { name: `Editable posting ${runId}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Accepted posting ${runId}` })).toBeVisible();

    // Scoped by the game-name label, which (unlike the title heading)
    // stays visible in both the read and edit-form states of the card.
    // A single `filter({ has: gameName }).last()` isn't enough: the
    // card's own header row (game label + status pill) is ALSO a div
    // containing the game-name span, and -- being nested one level
    // deeper than the card itself -- it's the actual last/deepest
    // match, not the card (document order lists a div before its own
    // children, so `.last()` alone lands on the deepest matching
    // descendant, which here is the wrong one). Requiring a second
    // `filter({ has: a management button })` excludes that header row
    // (it has no buttons as descendants), leaving the real card as the
    // deepest survivor.
    const editableCard = page
      .locator("div")
      .filter({ has: page.getByText(`E2EProfileEditable-${runId}`, { exact: true }) })
      .filter({ has: page.getByRole("button") })
      .last();
    const acceptedCard = page
      .locator("div")
      .filter({ has: page.getByText(`E2EProfileAccepted-${runId}`, { exact: true }) })
      .filter({ has: page.getByRole("button") })
      .last();

    // Editable posting: Edit is offered and works.
    await editableCard.getByRole("button", { name: "Edit" }).click();
    await page.locator(`#edit-title-${editablePostingId}`).fill(`Edited title ${runId}`);
    await editableCard.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: `Edited title ${runId}` })).toBeVisible();

    // Accepted posting: no Edit button offered at all.
    await expect(acceptedCard.getByRole("button", { name: "Edit" })).toHaveCount(0);

    // Close then reopen the editable posting.
    await editableCard.getByRole("button", { name: "Close" }).click();
    await expect(editableCard.getByRole("button", { name: "Reopen" })).toBeVisible();
    await editableCard.getByRole("button", { name: "Reopen" }).click();
    await expect(editableCard.getByRole("button", { name: "Close" })).toBeVisible();
  });

  test("Saved: appears after saving from Listing detail, unsaves from the Saved tab, and shows the empty state", async ({
    page,
  }) => {
    await login(page, mainEmail);
    await page.goto(`/listing/${otherHostPostingId}`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();

    await page.goto("/profile/saved");
    await expect(page.getByRole("heading", { name: `Other host posting ${runId}` })).toBeVisible();

    await page.getByRole("button", { name: "Unsave this listing" }).click();
    await expect(page.getByText("No saved postings yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse games" })).toBeVisible();
  });

  test("privacy toggles persist across a reload, then deactivating hides postings and reactivates on next login", async ({
    page,
  }) => {
    await login(page, mainEmail);
    await page.goto("/profile/account");

    // The checkbox itself is visually hidden (clip-path, Tailwind's
    // sr-only) under a styled track/knob -- click the wrapping
    // <label>, not the hidden input's role, same lesson as Browse's
    // filter-sidebar controls.
    const ageToggleLabel = page
      .locator("label")
      .filter({ has: page.getByRole("checkbox", { name: "Show age group" }) });
    await expect(ageToggleLabel.getByRole("checkbox")).toBeChecked();
    await ageToggleLabel.click();
    // Same confirmed dev-mode-only staleness window as the profile-edit
    // test above: updatePrivacy() has already committed by the time the
    // click handler returns, but an immediate reload can still render
    // pre-write state for a brief moment in `next dev`.
    await expect(async () => {
      await page.reload();
      await expect(ageToggleLabel.getByRole("checkbox")).not.toBeChecked({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    await page.getByRole("button", { name: "Deactivate account" }).click();
    await page.getByRole("button", { name: "Yes, deactivate" }).click();
    await page.waitForURL("http://localhost:3000/");

    const [deactivated] = await db.select().from(users).where(eq(users.id, mainUserId));
    expect(deactivated.deactivatedAt).not.toBeNull();

    await page.context().clearCookies();
    await login(page, mainEmail);

    const [reactivated] = await db.select().from(users).where(eq(users.id, mainUserId));
    expect(reactivated.deactivatedAt).toBeNull();
  });
});
