import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { settings, userGames, users } from "@/db/schema";

// 031. The suggestions only ever appear during account creation, so an
// existing session cannot exercise the main path -- these tests create a
// brand-new account for real.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const adminEmail = `e2e-games-admin-${runId}@example.com`;
const NEW_GAME = `Palworld ${runId}`;

let originalGames: string[];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

// Adds a game through the admin UI. Deliberately NOT a direct DB write:
// get-settings.ts's TTL cache lives in the dev SERVER's process, so a
// write from the test process is invisible to it for up to 5s -- and
// the next page load would save a stale list straight back over it.
// Going through the action invalidates the cache properly.
async function addSuggestedGame(page: Page, game: string) {
  await page.goto("/admin/settings");
  await page.getByRole("tab", { name: "Lists" }).click();
  await page.getByLabel("Add a suggested game").fill(game);
  await page.getByRole("button", { name: "Add game" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values({
    email: adminEmail,
    passwordHash,
    handle: `e2egamesadmin${runId}`,
    emailVerified: new Date(),
    role: "admin",
  });

  const [row] = await db.select({ suggestedGames: settings.suggestedGames }).from(settings).limit(1);
  originalGames = row.suggestedGames;
});

test.afterAll(async () => {
  await db.update(settings).set({ suggestedGames: originalGames });
  await db.delete(users).where(inArray(users.email, [adminEmail]));
  // Accounts created through the signup flow below.
  await db.delete(users).where(like(users.email, `e2e-games-new-${runId}%`));
});

test.describe("Admin-editable suggested games (quickstart Scenarios 1-2)", () => {
  test("an admin adds a game and the next new account is offered it", async ({ page }) => {
    await login(page, adminEmail);
    await addSuggestedGame(page, NEW_GAME);

    // A brand-new account, for real -- the wizard's games step is the
    // only place the suggestions ever appear, so an existing session
    // can't exercise this.
    const newEmail = `e2e-games-new-${runId}-a@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Username").fill(`e2egamesnew${runId}`);
    await page.getByLabel("Email").fill(newEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    // The wizard renders in place. Step 0 is name/avatar; the games step
    // ("What do you play?") is step 1, so advance to it. Continue stays
    // disabled until step 0 is valid, which needs a display name.
    await expect(page.getByRole("heading", { name: "Welcome! Let's set you up" })).toBeVisible();
    await page.getByLabel("Display name").fill("Games Tester");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "What do you play?" })).toBeVisible();

    // The admin's addition is offered alongside the defaults.
    await expect(page.getByRole("button", { name: NEW_GAME, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Valorant", exact: true })).toBeVisible();
  });

  test("removing a game leaves an existing player's games untouched", async ({ page }) => {
    // A player who lists a game we're about to retire.
    const holderEmail = `e2e-games-new-${runId}-holder@example.com`;
    const [holderUser] = await db
      .insert(users)
      .values({
        email: holderEmail,
        passwordHash: await hash(password, 10),
        handle: `e2egamesholder${runId}`,
        emailVerified: new Date(),
      })
      .returning({ id: users.id });
    // The player's games live in userGames (ADR 0015), not the retired column.
    await db.insert(userGames).values([
      { userId: holderUser.id, game: "CS2" },
      { userId: holderUser.id, game: NEW_GAME },
    ]);

    await login(page, adminEmail);
    await addSuggestedGame(page, NEW_GAME);

    // Retire it.
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Lists" }).click();
    await page.getByRole("button", { name: `Remove "${NEW_GAME}"` }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");

    // FR-006: the player still has it. An admin edit must never reach
    // into anybody's profile.
    const holderGames = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, holderUser.id));
    expect(holderGames.map((g) => g.game).sort()).toEqual(["CS2", NEW_GAME].sort());
  });
});
