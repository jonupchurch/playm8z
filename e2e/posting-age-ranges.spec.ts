import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

// 032 / ADR 0009. Covers the two things that fail SILENTLY:
//  - the rendered label (the old code appended "+" to the raw value, so
//    the new vocabulary renders "50plus+" with nothing erroring), and
//  - the legacy-value paths, which no UI can produce any more.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const hostEmail = `e2e-age-host-${runId}@example.com`;
const playerEmail = `e2e-age-player-${runId}@example.com`;

let hostId: string;
let fiftyPlusPostingId: string;
let legacyPostingId: string;

const basePosting = {
  game: "Forza",
  blurb: "",
  vibe: "fun" as const,
  platform: "pc" as const,
  region: "eu-west" as const,
  seatsTotal: 5,
  seatsOpen: 3,
  timeSlots: [],
  tags: [],
  micRequired: false,
  recurring: false,
  status: "open" as const,
};

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values([
    { email: hostEmail, passwordHash, handle: `e2eagehost${runId}`, emailVerified: new Date() },
    // A player whose OWN tag is still 18+ (ADR 0002, unchanged) -- used
    // to prove the posting tag gates nothing.
    { email: playerEmail, passwordHash, handle: `e2eageplayer${runId}`, emailVerified: new Date(), ageGroup: "18" },
  ]);
  const [host] = await db.select({ id: users.id }).from(users).where(eq(users.email, hostEmail));
  hostId = host.id;

  const rows = await db
    .insert(postings)
    .values([
      { hostId, ...basePosting, title: `Fifty plus party ${runId}`, ageGroup: "50plus" },
      // Pre-ADR-0009. Inserted directly because nothing can create one
      // any more -- which is exactly why it needs testing.
      { hostId, ...basePosting, title: `Legacy age party ${runId}`, ageGroup: "21" },
    ])
    .returning({ id: postings.id });
  fiftyPlusPostingId = rows[0].id;
  legacyPostingId = rows[1].id;
});

test.afterAll(async () => {
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(users).where(inArray(users.email, [hostEmail, playerEmail]));
});

test.describe("Posting age ranges (ADR 0009)", () => {
  // quickstart Scenario 1. The defect that ships silently.
  test("a 50+ posting renders `50+`, not 50plus / 50plus+ / 50++", async ({ page }) => {
    await page.goto(`/listing/${fiftyPlusPostingId}`);

    await expect(page.getByText("50+", { exact: true })).toBeVisible();
    await expect(page.getByText("50plus")).toHaveCount(0);
    await expect(page.getByText("50++")).toHaveCount(0);
  });

  // quickstart Scenario 4 -- the silent-relabel trap.
  test("a host edits an old posting's title and its legacy age survives untouched", async ({ page }) => {
    await page.goto(`/listing/${legacyPostingId}`);
    await expect(page.getByText("21+", { exact: true })).toBeVisible(); // FR-012

    await login(page, hostEmail);
    await page.goto("/profile/postings");

    const card = page.locator("div").filter({ hasText: `Legacy age party ${runId}` }).last();
    await card.getByRole("button", { name: "Edit" }).first().click();

    // Change ONLY the title. The age control must be carrying "21+" as
    // its own option -- otherwise the browser has silently snapped it to
    // the first option and this save relabels the posting.
    await expect(page.getByLabel("Age group")).toHaveValue("21");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();

    // Wait for the editor to close -- an observable success signal --
    // before reading the row. .click() only awaits the event dispatch,
    // not the Server Action behind it.
    await expect(page.getByLabel("Age group")).toHaveCount(0);

    const [row] = await db.select({ ageGroup: postings.ageGroup }).from(postings).where(eq(postings.id, legacyPostingId));
    expect(row.ageGroup).toBe("21"); // never relabelled (FR-011)
  });

  // quickstart Scenario 3 / FR-016.
  test("Browse's Any means `don't filter`, and a range matches exactly", async ({ page }) => {
    await page.goto("/browse?ageGroup=50plus");
    await expect(page.getByText(`Fifty plus party ${runId}`)).toBeVisible();
    // The active-filter pill reads the label, not "50plus+".
    await expect(page.getByText("50+", { exact: true }).first()).toBeVisible();

    // A different range must not surface it.
    await page.goto("/browse?ageGroup=30-49");
    await expect(page.getByText(`Fifty plus party ${runId}`)).toHaveCount(0);
  });

  // FR-009: a stale bookmark from before ADR 0009.
  test("a stale ?ageGroup=21 bookmark loads normally rather than erroring", async ({ page }) => {
    const response = await page.goto("/browse?ageGroup=21");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Browse open games" })).toBeVisible();
  });

  // quickstart Scenario 7 / FR-010. The requirement that is an absence.
  test("the tag gates nothing -- an 18+ player can view and apply to a 50+ party", async ({ page }) => {
    await login(page, playerEmail);
    await page.goto(`/listing/${fiftyPlusPostingId}`);

    await expect(page.getByText("50+", { exact: true })).toBeVisible();
    // Present and usable -- no age-based block, warning, or hidden state.
    await expect(page.getByRole("button", { name: /apply|request to join/i }).first()).toBeEnabled();
  });

  // quickstart Scenario 8 / FR-013: the user's own tag is a DIFFERENT
  // thing and is deliberately untouched.
  test("a player's own profile age tag still reads 18+ and is unaffected", async ({ page }) => {
    await login(page, playerEmail);
    await page.goto("/profile");
    await expect(page.getByText("18+", { exact: true })).toBeVisible();
  });
});
