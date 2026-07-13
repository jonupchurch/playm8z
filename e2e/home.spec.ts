import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const email = `e2e-home-${runId}@example.com`;
const password = "correcthorse";
const valorant = `Valorant-${runId}`;
const helldivers = `Helldivers-${runId}`;

test.beforeAll(async () => {
  // Trending/the feed read the whole table -- clear it first so this
  // test's assertions aren't at the mercy of whatever else exists in
  // the shared dev database (e.g. npm run db:seed-postings' sample data).
  await db.delete(postings);

  const passwordHash = await hash(password, 10);
  const [host] = await db
    .insert(users)
    .values({ email, passwordHash, handle: `e2ehome${runId}`, name: "Home Test Host" })
    .returning({ id: users.id });

  await db.insert(postings).values([
    {
      hostId: host.id,
      game: valorant,
      title: "Ranked grind",
      blurb: "Need 2 for a serious climb.",
      vibe: "serious",
      region: "eu-west",
      seatsTotal: 5,
      seatsOpen: 3,
      status: "open",
    },
    {
      hostId: host.id,
      game: helldivers,
      title: "Casual dives",
      blurb: "Just here to laugh.",
      vibe: "fun",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 1,
      status: "open",
    },
    {
      hostId: host.id,
      game: valorant,
      title: "Unrated fun",
      blurb: "No pressure at all.",
      vibe: "fun",
      region: "na-east",
      seatsTotal: 5,
      seatsOpen: 4,
      status: "open",
    },
    {
      hostId: host.id,
      game: "Full Game",
      title: "This is full",
      blurb: "Shouldn't appear.",
      vibe: "fun",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 0,
      status: "full",
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.describe("Home", () => {
  test("search narrows the feed live, filters combine, sort reorders, and a card navigates to Listing detail", async ({
    page,
  }) => {
    await login(page);

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    // Only open postings ever appear (FR-004).
    await expect(page.getByRole("heading", { name: "This is full" })).toHaveCount(0);

    // Scenario 1: search narrows the feed live.
    await page.getByLabel("Search a game, player, or vibe").fill(valorant);
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unrated fun" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casual dives" })).toHaveCount(0);
    await expect(page.getByText("2 open right now")).toBeVisible();

    // Scenario 2: Vibe + Region combine with AND semantics.
    await page.getByRole("button", { name: "Serious" }).click();
    await page.getByRole("button", { name: "EU-West" }).click();
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unrated fun" })).toHaveCount(0);

    await page.getByRole("button", { name: "All" }).click();
    await page.getByRole("button", { name: "Any region" }).click();
    await expect(page.getByRole("heading", { name: "Unrated fun" })).toBeVisible();

    // Scenario 3: sort changes order.
    await page.getByRole("button", { name: "Open seats" }).click();
    const byOpenSeats = await page.getByRole("heading", { level: 3 }).allTextContents();
    expect(byOpenSeats[0]).toBe("Unrated fun"); // 4 open beats 3 open

    // Scenario 4: selecting a card navigates to Listing detail.
    await page.getByRole("heading", { name: "Ranked grind" }).click();
    await expect(page).toHaveURL(/\/listing\//);
  });

  test("Trending row narrows the feed in place, without navigating away", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: new RegExp(valorant) }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByLabel("Search a game, player, or vibe")).toHaveValue(valorant);
    await expect(page.getByRole("heading", { name: "Casual dives" })).toHaveCount(0);
  });

  test("shows the empty state with a working Post this game CTA when nothing matches", async ({
    page,
  }) => {
    await login(page);
    await page.getByLabel("Search a game, player, or vibe").fill("nonexistent-game-xyz");
    await expect(page.getByText("No parties match that yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Post this game" })).toHaveAttribute(
      "href",
      "/post?game=nonexistent-game-xyz",
    );
  });
});
