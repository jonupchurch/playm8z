import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postings, settings, users } from "@/db/schema";

// 030. The promise unit tests structurally cannot prove: that the SAME
// list drives Post a Game and Browse, and that retiring a genre never
// touches a posting already using it.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const adminEmail = `e2e-genres-admin-${runId}@example.com`;
const hostEmail = `e2e-genres-host-${runId}@example.com`;
const NEW_GENRE = `Racing ${runId}`;
const DOOMED_GENRE = `Doomed ${runId}`;

let hostId: string;
let doomedPostingId: string;
// `settings` is a SHARED SINGLETON ROW -- captured up front and restored
// unconditionally, or this spec corrupts whichever one runs next.
let originalGenres: string[];

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
    { email: adminEmail, passwordHash, handle: `e2egenadmin${runId}`, emailVerified: new Date(), role: "admin" },
    { email: hostEmail, passwordHash, handle: `e2egenhost${runId}`, emailVerified: new Date() },
  ]);
  const [host] = await db.select({ id: users.id }).from(users).where(eq(users.email, hostEmail));
  hostId = host.id;

  const [row] = await db.select({ genres: settings.genres }).from(settings).limit(1);
  originalGenres = row.genres;

  // A live posting tagged with DOOMED_GENRE. Deliberately NOT added to
  // settings.genres here: a direct write to `settings` is invisible to
  // the dev server for up to 5s (get-settings.ts's in-memory TTL cache
  // lives in the SERVER's process -- the test process can't invalidate
  // it, and only upsertSettings() does, from inside the server).
  // Seeding the list that way let the first test load a stale list and
  // save it straight back, silently dropping this genre. So the tests
  // below add and remove genres through the UI, which goes through the
  // action and invalidates the cache properly.
  const [posting] = await db
    .insert(postings)
    .values({
      hostId,
      game: "Forza",
      title: `Doomed genre party ${runId}`,
      blurb: "",
      vibe: "fun",
      platform: "pc",
      region: "eu-west",
      seatsTotal: 5,
      seatsOpen: 3,
      timeSlots: [],
      tags: [],
      micRequired: false,
      recurring: false,
      genre: DOOMED_GENRE,
      ageGroup: "18",
      status: "open",
    })
    .returning({ id: postings.id });
  doomedPostingId = posting.id;
});

test.afterAll(async () => {
  await db.update(settings).set({ genres: originalGenres });
  await db.delete(postings).where(inArray(postings.id, [doomedPostingId]));
  await db.delete(users).where(inArray(users.email, [adminEmail, hostEmail]));
});

test.describe("Admin-editable genres (quickstart Scenarios 1-2)", () => {
  test("an admin adds a genre and it appears on BOTH Post a game and Browse", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Lists" }).click();

    await page.getByLabel("Add a genre").fill(NEW_GENRE);
    await page.getByRole("button", { name: "Add genre" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    // Wait for an observable success signal before reading anything else
    // -- .click() only awaits the event dispatch, not the Server Action.
    await expect(page.getByRole("status")).toHaveText("Saved.");

    // FR-005: the whole point. Both screens, one list.
    // Both controls are an sr-only input inside a <label>, so they're
    // radio/checkbox roles rather than buttons, and the input itself is
    // visually hidden -- assert it's attached, not visible.
    await page.goto("/post");
    await expect(page.getByRole("radio", { name: NEW_GENRE, exact: true })).toBeAttached();

    await page.goto("/browse");
    await expect(page.getByRole("checkbox", { name: NEW_GENRE, exact: true })).toBeAttached();
  });

  test("removing a genre pulls it from both screens but leaves an existing posting untouched", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Lists" }).click();

    // Add it through the UI first, so the whole retire round trip is
    // real -- and so the list is never seeded by a direct write the
    // server can't see for 5s (see beforeAll).
    await page.getByLabel("Add a genre").fill(DOOMED_GENRE);
    await page.getByRole("button", { name: "Add genre" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");

    // Now retire it.
    await page.getByRole("button", { name: `Remove "${DOOMED_GENRE}"` }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");

    // Gone as a choice and as a filter...
    await page.goto("/post");
    await expect(page.getByRole("radio", { name: DOOMED_GENRE, exact: true })).toHaveCount(0);
    await page.goto("/browse");
    await expect(page.getByRole("checkbox", { name: DOOMED_GENRE, exact: true })).toHaveCount(0);

    // ...but FR-007: the posting that used it is untouched and still
    // shows it. This is the destructive failure the feature must never
    // have. The listing renders it as `· <genre>` inside a larger line,
    // so this is a substring match by design.
    await page.goto(`/listing/${doomedPostingId}`);
    await expect(page.getByText(DOOMED_GENRE)).toBeVisible();

    const [row] = await db.select({ genre: postings.genre }).from(postings).where(eq(postings.id, doomedPostingId));
    expect(row.genre).toBe(DOOMED_GENRE);
  });

  test("a stale bookmark naming a genre that isn't offered still honours the genres that remain", async ({ page }) => {
    // FR-009. Deliberately different from the old behaviour, where one
    // unknown genre silently discarded the WHOLE filter (research.md #5)
    // and Browse showed everything, ignoring FPS too.
    //
    // Uses a genre that is never in the list, so this test doesn't
    // depend on another test having removed one first.
    const unknown = `NeverAGenre-${runId}`;
    const response = await page.goto(`/browse?genres=FPS&genres=${encodeURIComponent(unknown)}`);
    expect(response?.status()).toBe(200);
    // FPS survives the stale filter and is still applied...
    await expect(page.getByRole("checkbox", { name: "FPS", exact: true })).toBeChecked();
    // ...while the unknown genre is simply not offered at all.
    await expect(page.getByRole("checkbox", { name: unknown, exact: true })).toHaveCount(0);
  });
});
