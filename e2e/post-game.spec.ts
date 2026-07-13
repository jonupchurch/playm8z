import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `e2e-post-verified-${runId}@example.com`;
const unverifiedEmail = `e2e-post-unverified-${runId}@example.com`;
const password = "correcthorse";
const game = `E2EGame-${runId}`;

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values([
    {
      email: verifiedEmail,
      passwordHash,
      handle: `e2epostver${runId}`,
      name: "Verified Poster",
      emailVerified: new Date(),
    },
    {
      email: unverifiedEmail,
      passwordHash,
      handle: `e2epostunver${runId}`,
      name: "Unverified Poster",
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(postings).where(eq(postings.game, game));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.describe("Post a game (quickstart.md Scenarios 1-4)", () => {
  test("happy path: verified user publishes, live preview updates, and it's visible on Browse", async ({
    page,
  }) => {
    await login(page, verifiedEmail);
    await page.goto("/post");

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    const publish = page.getByRole("button", { name: /Publish listing/ });
    await expect(publish).toBeDisabled();

    await page.getByLabel("Game").fill(game);
    await expect(publish).toBeDisabled();

    const title = `Ranked grind ${runId}`;
    await page.getByLabel("Listing title").fill(title);
    await expect(publish).toBeEnabled();

    // Live preview reflects the game/title immediately.
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Group size / Spots open clamping: raise spots open to the max
    // allowed for size 4 (3), then shrink the group and confirm spots
    // open clamps down automatically rather than staying invalid.
    await page.getByRole("button", { name: "Increase spots open" }).click();
    await expect(page.getByRole("status", { name: "Spots open" })).toHaveText("3");
    await page.getByRole("button", { name: "Decrease group size" }).click();
    await expect(page.getByRole("status", { name: "Group size" })).toHaveText("3");
    await expect(page.getByRole("status", { name: "Spots open" })).toHaveText("2");

    await publish.click();
    await page.waitForURL("http://localhost:3000/browse");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("logged-out visitor is routed to log in instead of seeing the form", async ({ page }) => {
    const response = await page.goto("/post");
    await expect(page).toHaveURL(/\/login/);
    expect(response?.status()).toBeLessThan(400);
  });

  test("unverified user is blocked from publishing, with no posting created", async ({ page }) => {
    await login(page, unverifiedEmail);
    await page.goto("/post");

    const title = `Unverified attempt ${runId}`;
    await page.getByLabel("Game").fill(`${game}-unverified`);
    await page.getByLabel("Listing title").fill(title);
    await page.getByRole("button", { name: /Publish listing/ }).click();

    await expect(page.locator('p[role="alert"]')).toContainText(/verify your email/i);
    await expect(page).toHaveURL(/\/post/);

    const rows = await db.select().from(postings).where(eq(postings.title, title));
    expect(rows).toHaveLength(0);
  });

  test("validation guardrails: Publish stays disabled without game+title, and the title input caps at 60 chars", async ({
    page,
  }) => {
    await login(page, verifiedEmail);
    await page.goto("/post");

    const publish = page.getByRole("button", { name: /Publish listing/ });
    await expect(publish).toBeDisabled();

    await page.getByLabel("Game").fill(`${game}-guardrail`);
    await expect(publish).toBeDisabled(); // title still empty

    await page.getByLabel("Game").fill("");
    await page.getByLabel("Listing title").fill("Only a title");
    await expect(publish).toBeDisabled(); // game still empty

    const longTitle = "a".repeat(80);
    await page.getByLabel("Listing title").fill(longTitle);
    await expect(page.getByLabel("Listing title")).toHaveValue("a".repeat(60));
  });
});
