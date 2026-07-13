import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const email = `e2e-skip-${runId}@example.com`;
const handle = `e2eskip${runId}`;

test.describe("Skip onboarding (quickstart.md Scenario 2)", () => {
  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
  });

  test("skips at Step 1, reaches Home, and can log out and back in", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Username").fill(handle);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "Welcome! Let's set you up" })).toBeVisible();
    await page.getByRole("button", { name: "Skip for now" }).click();

    await expect(page.getByText("You're all set!")).toBeVisible();
    await page.getByRole("button", { name: "Start browsing games →" }).click();
    await page.waitForURL("http://localhost:3000/");

    const [afterSkip] = await db.select().from(users).where(eq(users.email, email));
    expect(afterSkip?.handle).toBe(handle);
    expect(afterSkip?.name).toBeNull();

    // Logging out and back in still works despite the incomplete profile
    // (FR-012's edge case: nothing blocks a later login), and doesn't
    // resurface onboarding -- the Credentials account already has a
    // handle from registration (continue/page.tsx).
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("http://localhost:3000/");
  });
});
