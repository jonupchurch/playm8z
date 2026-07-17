import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const hostEmail = `e2e-typeahead-${runId}@example.com`;
const seededGame = `Valorant ${runId}`; // distinctive, so the near-miss is unambiguous

let hostId: string;
let gameId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [host] = await db.insert(users)
    .values({ email: hostEmail, handle: `e2eta${runId}`, passwordHash, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  const [g] = await db.insert(games)
    .values({ name: seededGame, normalizedName: seededGame.trim().toLowerCase() })
    .returning({ id: games.id });
  gameId = g.id;
});

test.afterAll(async () => {
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(games).where(eq(games.id, gameId));
  await db.delete(users).where(eq(users.id, hostId));
});

test('"Did you mean?" corrects a near-miss to the canonical game, and it publishes with that name', async ({
  page,
}) => {
  await login(page, hostEmail);
  await page.goto("/post");

  // Type a near-miss (drop a letter). The seeded game name ends "...t <runId>";
  // dropping the "t" is one edit.
  const nearMiss = seededGame.replace("Valorant", "Valoran");
  await page.getByLabel("Game").fill(nearMiss);

  const nudge = page.getByRole("button", { name: seededGame, exact: true });
  await expect(nudge).toBeVisible();
  await nudge.click();
  await expect(page.getByLabel("Game")).toHaveValue(seededGame);

  await page.getByLabel("Title").fill(`Ranked ${runId}`);
  await page.getByRole("button", { name: "Publish listing →" }).click();
  await page.waitForURL("http://localhost:3000/browse");

  const rows = await db.select({ game: postings.game }).from(postings).where(eq(postings.hostId, hostId));
  expect(rows.some((r) => r.game === seededGame)).toBe(true);
});

test("a brand-new game is never blocked or rewritten (SC-004)", async ({ page }) => {
  await login(page, hostEmail);
  await page.goto("/post");

  const brandNew = `ZZBrandNew ${runId}`;
  await page.getByLabel("Game").fill(brandNew);
  // No nudge, no forced change.
  await expect(page.getByText(/Did you mean/)).toHaveCount(0);
  await expect(page.getByLabel("Game")).toHaveValue(brandNew);

  await page.getByLabel("Title").fill(`New ${runId}`);
  await page.getByRole("button", { name: "Publish listing →" }).click();
  await page.waitForURL("http://localhost:3000/browse");

  const rows = await db.select({ game: postings.game }).from(postings).where(eq(postings.hostId, hostId));
  expect(rows.some((r) => r.game === brandNew)).toBe(true);
});
