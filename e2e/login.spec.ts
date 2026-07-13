import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const email = `e2e-login-${runId}@example.com`;
const password = "correcthorse";

test.describe("Login (quickstart.md Scenario 3)", () => {
  test.beforeAll(async () => {
    const passwordHash = await hash(password, 10);
    await db.insert(users).values({
      email,
      passwordHash,
      handle: `e2elogin${runId}`,
      name: "Returning Player",
    });
  });

  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
  });

  test("logs in and lands directly on Home, with no onboarding shown", async ({ page }) => {
    await page.goto("/login");

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("http://localhost:3000/");
    expect(page.url()).not.toContain("/onboarding");
  });

  test("shows a generic error on an incorrect password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });
});
