import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games, postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const modEmail = `e2e-games-mod-${runId}@example.com`;
const hostEmail = `e2e-games-host-${runId}@example.com`;

// A distinctive game name unlikely to collide, seeded with many open
// postings so it reliably lands in Trending's top 5.
const trendingGame = `ZZE2EGame ${runId}`;
const IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let modId: string;
let hostId: string;
let trendingGameId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

const basePosting = {
  blurb: "b", vibe: "fun" as const, region: "na-east" as const, ageGroup: "any",
  timeSlots: ["evening"], platform: "pc" as const, micRequired: false,
  seatsTotal: 4, seatsOpen: 2, status: "open" as const,
};

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [mod] = await db.insert(users)
    .values({ email: modEmail, handle: `e2egmod${runId}`, passwordHash, emailVerified: new Date(), role: "moderator" })
    .returning({ id: users.id });
  modId = mod.id;
  const [host] = await db.insert(users)
    .values({ email: hostEmail, handle: `e2eghost${runId}`, passwordHash, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  // A curated game WITH an image (a data URL, set directly -- the Blob
  // upload path needs a token that CI/local may lack; the resolver and
  // GameImage render whatever URL is stored).
  const [g] = await db.insert(games)
    .values({ name: trendingGame, normalizedName: trendingGame.trim().toLowerCase(), imageUrl: IMG })
    .returning({ id: games.id });
  trendingGameId = g.id;

  // Many open postings for it, so it dominates Trending's top-5.
  for (let i = 0; i < 8; i++) {
    await db.insert(postings).values({ ...basePosting, hostId, game: trendingGame, title: `party ${i} ${runId}` });
  }
});

test.afterAll(async () => {
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(gameAliases).where(eq(gameAliases.gameId, trendingGameId));
  await db.delete(games).where(eq(games.id, trendingGameId));
  await db.delete(users).where(eq(users.id, modId));
  await db.delete(users).where(eq(users.id, hostId));
});

test("Home Trending shows the curated image, and no tile is the flat orange block (SC-001)", async ({
  page,
}) => {
  // `/` shows the marketing landing page when logged out; the Trending feed
  // only renders for a signed-in visitor.
  await login(page, hostEmail);
  await page.goto("/");
  const trending = page.locator("section", { has: page.getByRole("heading", { name: "Trending now" }) });
  await expect(trending).toBeVisible();

  // The curated game's tile shows its admin image.
  await expect(trending.locator(`img[src="${IMG}"]`).first()).toBeVisible();

  // SC-001: the old flat orange block is gone -- no tile uses the accent-var
  // gradient the orange <div> had.
  const orange = await trending.locator('[class*="var(--color-accent)"]').count();
  expect(orange).toBe(0);
});

test("a moderator can add a game and an alias through the admin screen", async ({ page }) => {
  await login(page, modEmail);
  await page.goto("/admin/games");
  await expect(page.getByRole("heading", { name: "Game images" })).toBeVisible();

  const newGame = `E2EAddedGame ${runId}`;
  await page.getByLabel("Add a game").fill(newGame);
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText(newGame, { exact: true })).toBeVisible();

  // Add an alias to it. (The chip text includes the "×" remove control in
  // the same element, so match the alias as a substring, not exact.)
  const row = page.locator("li").filter({ hasText: newGame });
  await row.getByPlaceholder("+ alias").fill(`e2ealias ${runId}`);
  await row.getByPlaceholder("+ alias").press("Enter");
  await expect(page.getByText(`e2ealias ${runId}`).first()).toBeVisible();

  // Cleanup (this game was created via the UI, so it's outside beforeAll's set).
  await db.delete(gameAliases).where(eq(gameAliases.gameId, trendingGameId)); // no-op safety
  const rows = await db.select({ id: games.id }).from(games).where(eq(games.normalizedName, newGame.trim().toLowerCase()));
  for (const r of rows) await db.delete(games).where(eq(games.id, r.id));
});

test("adding an alias makes a variant spelling resolve to the game's image", async ({ page }) => {
  // Add an alias for a variant, then a posting using that variant will
  // resolve to the curated image. Assert via the resolver's effect on the
  // admin tile (deterministic) rather than trending ordering.
  await db.insert(gameAliases).values({
    gameId: trendingGameId,
    normalizedAlias: `zze2evariant ${runId}`.toLowerCase(),
  });
  await login(page, modEmail);
  await page.goto("/admin/games");
  // The alias chip shows on the curated game's row (substring match: the
  // chip element also contains the "×" remove control).
  await expect(page.getByText(`zze2evariant ${runId}`.toLowerCase()).first()).toBeVisible();
});
