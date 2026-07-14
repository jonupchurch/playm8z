import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

// Facet checkboxes/radios use a visually-hidden native input
// (clip-path) under a styled pill -- real users toggle it by clicking
// the visible label (native label-click-forwarding), but Playwright's
// own actionability check on the *input* element fails since clip-path
// makes it non-hit-testable at its own coordinates. Click the label
// instead, exactly like a real user would.
function selectFacet(page: Page, label: string) {
  return page.locator("label", { hasText: label }).first().click();
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `e2e-browse-${runId}@example.com`;
const valorant = `Valorant-${runId}`;
const helldivers = `Helldivers-${runId}`;
const catan = `Catan-${runId}`;

test.beforeAll(async () => {
  // Facet counts and result totals are asserted exactly -- clear the
  // table first so they aren't at the mercy of whatever else exists in
  // the shared dev database (same fix as Home/get-trending's tests).
  await db.delete(postings);

  const [host] = await db
    .insert(users)
    .values({ email, handle: `e2ebrowse${runId}`, avatarColor: "amber-orange" })
    .returning({ id: users.id });

  await db.insert(postings).values([
    {
      hostId: host.id,
      game: valorant,
      genre: "FPS",
      title: "Ranked grind",
      blurb: "Need 2 for a serious climb.",
      vibe: "serious",
      region: "eu-west",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      micRequired: true,
      seatsTotal: 5,
      seatsOpen: 3,
      status: "open",
    },
    {
      hostId: host.id,
      game: helldivers,
      genre: "Co-op PvE",
      title: "Casual dives",
      blurb: "Just here to laugh.",
      vibe: "fun",
      region: "na-west",
      ageGroup: "18",
      timeSlots: ["morning"],
      platform: "cross",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 1,
      status: "open",
    },
    {
      hostId: host.id,
      game: catan,
      genre: "Tabletop",
      title: "Board game night",
      blurb: "Casual Catan and snacks.",
      vibe: "fun",
      region: "eu-west",
      ageGroup: "21",
      timeSlots: ["weekend"],
      platform: "table",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 4,
      status: "open",
    },
    {
      hostId: host.id,
      game: "Full Game",
      genre: "FPS",
      title: "This is full",
      blurb: "Shouldn't appear.",
      vibe: "fun",
      region: "eu-west",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 0,
      status: "full",
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

test.describe("Browse", () => {
  test("loads for a logged-out visitor, with axe-core clean, and only shows open postings", async ({
    page,
  }) => {
    const response = await page.goto("/browse");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Browse open games" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await expect(page.getByRole("heading", { name: "This is full" })).toHaveCount(0);
  });

  test("search narrows results, live facet counts match seeded data, and a genre chip combines with it", async ({
    page,
  }) => {
    await page.goto("/browse");

    // Scenario 5: live Game/Region facet counts.
    await expect(page.getByText(valorant).first()).toBeVisible();
    const valorantRow = page.locator("label", { hasText: valorant });
    await expect(valorantRow.getByText("1", { exact: true })).toBeVisible();

    // Scenario 1: keyword search.
    await page.getByLabel("Search games, players, keywords").fill(valorant);
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casual dives" })).toHaveCount(0);

    // Genre chip combines with the keyword (AND across facets).
    await selectFacet(page, "FPS");
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
  });

  test("multi-select OR within a facet, AND across facets", async ({ page }) => {
    await page.goto(`/browse?q=${runId}`);

    // OR within Region: selecting both regions used by our 3 postings
    // brings back all of them.
    await selectFacet(page, "EU-West");
    await selectFacet(page, "NA-West");
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casual dives" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Board game night" })).toBeVisible();

    // AND across facets: adding Serious narrows to just the one
    // Serious+EU-West/NA-West posting.
    await selectFacet(page, "Serious");
    await expect(page.getByRole("heading", { name: "Ranked grind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casual dives" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Board game night" })).toHaveCount(0);
  });

  test("active filter pills are removable independently, and Clear all resets everything", async ({
    page,
  }) => {
    await page.goto(`/browse?q=${runId}`);

    await selectFacet(page, "Serious");
    await selectFacet(page, "FPS");

    const seriousPill = page.getByRole("button", { name: /Serious/ });
    const fpsPill = page.getByRole("button", { name: /FPS/ }).first();
    await expect(seriousPill).toBeVisible();
    await expect(fpsPill).toBeVisible();

    // Removing one pill leaves the other active.
    await seriousPill.click();
    await expect(page.getByRole("radio", { name: "Serious" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "FPS" })).toBeChecked();

    // Clear all resets everything, including the keyword.
    await page.getByRole("button", { name: "Clear all" }).first().click();
    await expect(page.getByRole("checkbox", { name: "FPS" })).not.toBeChecked();
    await expect(page).toHaveURL("http://localhost:3000/browse");
  });

  test("sort changes the result order", async ({ page }) => {
    await page.goto(`/browse?q=${runId}`);

    await page.getByRole("button", { name: "Open seats" }).click();
    await page.waitForURL(/sort=seats/);
    // The sort itself is server-driven (a fresh query, not a client
    // re-order) -- wait for the actually-reordered heading before
    // reading it, rather than a fixed-timing snapshot right after the
    // click.
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(
      "Board game night", // 4 open beats 3 and 1
    );
  });

  test("selecting a result navigates to Listing detail", async ({ page }) => {
    await page.goto(`/browse?q=${runId}`);
    await page.getByRole("heading", { name: "Ranked grind" }).click();
    await expect(page).toHaveURL(/\/listing\//);
  });

  test("shows the empty state with working Clear filters and Post a game actions", async ({
    page,
  }) => {
    await page.goto("/browse?q=nonexistent-game-xyz");
    await expect(page.getByText("No parties match those filters.")).toBeVisible();
    // Scoped by href, not role+name -- the nav's own "Post a game" link
    // (site-header.tsx) now shares this exact accessible name.
    await expect(page.locator('a[href="/post?game=nonexistent-game-xyz"]')).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL("http://localhost:3000/browse");
  });
});
