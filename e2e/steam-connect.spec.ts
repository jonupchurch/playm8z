import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { userGames, users } from "@/db/schema";
import { db } from "@/db";

// 038 e2e covers the surface that does NOT require live Steam: the connect
// redirect, the connected/not-connected UI, disconnect (keeping games), and
// a11y. The library-import review hits Steam's servers, so it's covered by the
// unit/integration/component tests, not here (per research.md #6 -- never e2e
// against the live third-party service).
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const email = `e2e-steam-${runId}@example.com`;
const handle = `e2esteam${runId}`;
const steamId = `e2esteam-${runId}`;
let userId: string;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash, handle, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = u.id;
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, email)); // cascades to userGames
});

test.beforeEach(async () => {
  await db.update(users).set({ steamId: null, steamConnectedAt: null }).where(eq(users.id, userId));
});

test.describe("Steam connect & library import (038)", () => {
  test("a not-connected account shows Connect Steam, and the connect route redirects to Steam", async ({ page }) => {
    await login(page);
    await page.goto("/profile/account");
    await expect(page.getByRole("link", { name: "Connect Steam" })).toBeVisible();

    // The connect route hands off to Steam's OpenID login (don't follow it).
    const res = await page.request.get("/api/steam/connect", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("steamcommunity.com/openid/login");
    expect(location).toContain("checkid_setup");

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
  });

  test("shows an error banner when a connect attempt fails verification", async ({ page }) => {
    await login(page);
    await page.goto("/profile/account?steam=verify-failed");
    await expect(page.getByText(/couldn't verify with Steam/i)).toBeVisible();
  });

  test("a connected account can reach import + disconnect, and disconnecting keeps imported games", async ({ page }) => {
    await db.update(users).set({ steamId, steamConnectedAt: new Date() }).where(eq(users.id, userId));
    await db.insert(userGames).values({ userId, game: `Imported ${runId}` });

    await login(page);
    await page.goto("/profile/account");

    await expect(page.getByText("✓ Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: "Import library" })).toBeVisible();

    await page.getByRole("button", { name: "Disconnect" }).click();
    // Wait for the observable success signal (back to not-connected) before asserting the DB.
    await expect(page.getByRole("link", { name: "Connect Steam" })).toBeVisible();

    const [u] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.id, userId));
    expect(u.steamId).toBeNull();
    const games = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(games).toHaveLength(1); // imported game kept

    await db.delete(userGames).where(eq(userGames.userId, userId));
  });
});
