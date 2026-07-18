import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const email = `e2e-signup-${runId}@example.com`;
const handle = `e2esignup${runId}`;

test.describe("Sign up and onboarding (quickstart.md Scenario 1)", () => {
  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
  });

  test("completes sign-up and all 4 onboarding steps, landing on the completion screen", async ({
    page,
  }) => {
    await page.goto("/signup");

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByLabel("Username").fill(handle);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "Welcome! Let's set you up" })).toBeVisible();

    // Step 1: profile
    await page.getByLabel("Display name").fill("Mara");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: games
    await expect(page.getByRole("heading", { name: "What do you play?" })).toBeVisible();
    await page.getByRole("button", { name: "Valorant" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: where & how
    await expect(page.getByRole("heading", { name: "Where & how do you play?" })).toBeVisible();

    const midWizardScan = await new AxeBuilder({ page }).analyze();
    expect(midWizardScan.violations).toEqual([]);

    await page.getByLabel("Region").selectOption("na-west");
    await page.getByRole("button", { name: "18+" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: vibe
    await expect(page.getByRole("heading", { name: "What's your vibe?" })).toBeVisible();
    await page.getByRole("button", { name: "Casual" }).click();
    await page.getByRole("button", { name: "Finish setup →" }).click();

    await expect(page.getByText("You're all set, Mara!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start browsing games →" })).toBeVisible();

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row?.name).toBe("Mara");
    expect(row?.handle).toBe(handle);
    expect(row?.region).toBe("na-west");
    expect(row?.ageGroup).toBe("18");
    expect(row?.vibe).toBe("fun");
    expect(row?.emailVerified).toBeNull();

    // 042 (ADR 0015): onboarding games are reconciled into userGames now, not the
    // retired users.gamesPlayed column, so the picked game must be asserted there.
    const games = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, row.id));
    expect(games.map((g) => g.game)).toContain("Valorant");
  });
});
