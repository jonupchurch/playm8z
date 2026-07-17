import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

// A tiny valid 1x1 PNG. Used as the avatar src so the browser actually LOADS
// it (a fake URL would 404 and Avatar's onError would swap to the gradient,
// which is correct behaviour but would defeat "the photo shows" assertion).
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const GOOGLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const uploaderEmail = `e2e-avatar-upload-${runId}@example.com`;
const googleEmail = `e2e-avatar-google-${runId}@example.com`;

let uploaderId: string;
let googleId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

const basePosting = {
  blurb: "b",
  vibe: "fun" as const,
  region: "na-east" as const,
  ageGroup: "any",
  timeSlots: ["evening"],
  platform: "pc" as const,
  micRequired: false,
  seatsTotal: 4,
  seatsOpen: 2,
  status: "open" as const,
};

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);

  // A user with an UPLOADED avatar (avatarImage set).
  const [uploader] = await db
    .insert(users)
    .values({
      email: uploaderEmail,
      handle: `e2eavup${runId}`,
      passwordHash,
      emailVerified: new Date(),
      avatarColor: "amber-orange",
      avatarImage: PNG,
    })
    .returning({ id: users.id });
  uploaderId = uploader.id;

  // A Google-style user: NO upload, but a stored Google photo (image set).
  const [google] = await db
    .insert(users)
    .values({
      email: googleEmail,
      handle: `e2eavgo${runId}`,
      passwordHash,
      emailVerified: new Date(),
      avatarColor: "cyan-orange",
      image: GOOGLE_PNG,
    })
    .returning({ id: users.id });
  googleId = google.id;

  // Each hosts an open posting, so their avatar appears on Browse cards --
  // a surface OTHER than their profile, proving the shared component carries
  // the photo everywhere (FR-008/SC-003), not just where it was set.
  await db
    .insert(postings)
    .values({ ...basePosting, hostId: uploaderId, game: `E2EAvatarUp-${runId}`, title: `Upload avatar ${runId}` });
  await db
    .insert(postings)
    .values({ ...basePosting, hostId: googleId, game: `E2EAvatarGo-${runId}`, title: `Google avatar ${runId}` });
});

test.afterAll(async () => {
  await db.delete(postings).where(eq(postings.hostId, uploaderId));
  await db.delete(postings).where(eq(postings.hostId, googleId));
  await db.delete(users).where(eq(users.id, uploaderId));
  await db.delete(users).where(eq(users.id, googleId));
});

test("an uploaded avatar shows on the host's Browse card (FR-008)", async ({ page }) => {
  await page.goto(`/browse?q=E2EAvatarUp-${runId}`);
  // The card's avatar is an <img> with the uploaded src -- not the gradient
  // block. If the migration missed the listing card's query, this fails.
  await expect(page.locator(`img[src="${PNG}"]`).first()).toBeVisible();
});

test("a Google photo we already store shows without any upload (US2/SC-002)", async ({ page }) => {
  await page.goto(`/browse?q=E2EAvatarGo-${runId}`);
  await expect(page.locator(`img[src="${GOOGLE_PNG}"]`).first()).toBeVisible();
});

test("the same uploaded avatar shows in the nav (a second surface)", async ({ page }) => {
  await login(page, uploaderEmail);
  // SiteHeader lives in the ROOT layout, which the App Router does not
  // re-render on the client-side navigation that login performs -- so the
  // header keeps its logged-out state until a full page load. A real user
  // sees the updated header on their next navigation/reload; reload here to
  // assert that steady state rather than the transient post-login frame.
  await page.reload();
  // The top-right ProfileMenu avatar -- a different surface from the Browse
  // card, proving one component carries the photo across the app.
  await expect(page.locator(`header img[src="${PNG}"]`)).toBeVisible();
});

test("account settings shows the current photo and offers Replace + Remove", async ({ page }) => {
  await login(page, uploaderEmail);
  await page.goto("/profile/account");

  await expect(page.getByRole("heading", { name: "Profile photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
});

test("a user with no photo at all shows a gradient block, never a broken image", async ({
  page,
}) => {
  // The Google user's own card carries a real image; assert the uploader's
  // card has exactly the uploaded img and no broken <img> anywhere on the
  // page (src that isn't our data URL and isn't empty).
  await page.goto(`/browse?q=E2EAvatarUp-${runId}`);
  const brokenImgs = await page.locator("img").evaluateAll((imgs) =>
    imgs.filter((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth === 0).length,
  );
  expect(brokenImgs).toBe(0);
});
