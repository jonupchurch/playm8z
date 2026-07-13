import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, questions, savedListings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const hostEmail = `e2e-listing-host-${runId}@example.com`;
const applicantEmail = `e2e-listing-applicant-${runId}@example.com`;
const unverifiedEmail = `e2e-listing-unverified-${runId}@example.com`;
const acceptedEmail = `e2e-listing-accepted-${runId}@example.com`;

let openPostingId: string;
let fullPostingId: string;
let applicantId: string;

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [host] = await db
    .insert(users)
    .values({
      email: hostEmail,
      passwordHash,
      handle: `e2elistinghost${runId}`,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });

  const [applicant] = await db
    .insert(users)
    .values({
      email: applicantEmail,
      passwordHash,
      handle: `e2elistingapplicant${runId}`,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  applicantId = applicant.id;

  await db.insert(users).values({
    email: unverifiedEmail,
    passwordHash,
    handle: `e2elistingunverified${runId}`,
  });

  const [accepted] = await db
    .insert(users)
    .values({
      email: acceptedEmail,
      passwordHash,
      handle: `e2elistingaccepted${runId}`,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });

  const base = {
    hostId: host.id,
    blurb: "A test listing for e2e coverage.",
    vibe: "fun",
    region: "na-east",
    ageGroup: "18",
    timeSlots: ["evening"],
    platform: "pc",
    micRequired: false,
    seatsTotal: 4,
    status: "open" as const,
  };

  const [open] = await db
    .insert(postings)
    .values({
      ...base,
      game: `E2EListing-${runId}`,
      title: `Open listing ${runId}`,
      seatsOpen: 2,
      tags: ["e2etag"],
    })
    .returning({ id: postings.id });
  openPostingId = open.id;

  const [full] = await db
    .insert(postings)
    .values({
      ...base,
      game: `E2EListingFull-${runId}`,
      title: `Full listing ${runId}`,
      seatsOpen: 0,
    })
    .returning({ id: postings.id });
  fullPostingId = full.id;

  await db.insert(applications).values({
    postingId: openPostingId,
    applicantId: accepted.id,
    status: "accepted",
  });
});

test.afterAll(async () => {
  await db.delete(questions).where(eq(questions.postingId, openPostingId));
  await db.delete(applications).where(eq(applications.postingId, openPostingId));
  await db.delete(savedListings).where(eq(savedListings.postingId, openPostingId));
  await db.delete(postings).where(eq(postings.id, openPostingId));
  await db.delete(postings).where(eq(postings.id, fullPostingId));
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, applicantEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.email, acceptedEmail));
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.describe("Listing detail (quickstart.md Scenarios 1-4)", () => {
  test("loads for a logged-out visitor, with axe-core clean, showing 'Log in to apply'", async ({
    page,
  }) => {
    const response = await page.goto(`/listing/${openPostingId}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: `Open listing ${runId}` })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await expect(page.getByRole("link", { name: "Log in to apply" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in to ask a question" })).toBeVisible();
  });

  test("404s for a nonexistent listing id", async ({ page }) => {
    const response = await page.goto("/listing/00000000-0000-0000-0000-000000000000");
    expect(response?.status()).toBe(404);
  });

  test("apply, confirm, reload persists, then withdraw", async ({ page }) => {
    await login(page, applicantEmail);
    await page.goto(`/listing/${openPostingId}`);

    await page.getByLabel(/Message to @/).fill("I'd love to join!");
    await page.getByRole("button", { name: "Apply for a slot" }).click();

    await expect(page.getByText("Application sent!")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Application sent!")).toBeVisible();

    await page.getByRole("button", { name: "Withdraw application" }).click();
    await expect(page.getByRole("button", { name: "Apply for a slot" })).toBeVisible();

    const [row] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.postingId, openPostingId), eq(applications.applicantId, applicantId)));
    expect(row.status).toBe("withdrawn");
  });

  test("Q&A: a non-host asks, the host replies, visible to a logged-out viewer", async ({
    page,
    browser,
  }) => {
    await login(page, applicantEmail);
    await page.goto(`/listing/${openPostingId}`);

    const questionText = `What rank are you looking for ${runId}?`;
    await page.getByLabel("Ask a question").fill(questionText);
    await page.getByRole("button", { name: "Ask" }).click();
    await expect(page.getByText(questionText)).toBeVisible();

    await login(page, hostEmail);
    await page.goto(`/listing/${openPostingId}`);
    await expect(page.getByText(questionText)).toBeVisible();

    const replyText = "Plat or above works great.";
    await page.getByLabel("Reply to this question").fill(replyText);
    await page.getByRole("button", { name: "Reply" }).click();
    await expect(page.getByText(replyText)).toBeVisible();

    // A genuinely separate browser context (not just this page's
    // cookies cleared) -- `next dev`'s weaker Cache-Control (missing
    // `no-store`, unlike a production build) lets Chromium reuse a
    // cached response across a cookie change within the *same*
    // context, a dev-only artifact confirmed via a real `next build`/
    // `next start` check, not a product bug. A fresh context has no
    // such shared cache.
    const loggedOutContext = await browser.newContext();
    const loggedOutPage = await loggedOutContext.newPage();
    await loggedOutPage.goto(`/listing/${openPostingId}`);
    await expect(loggedOutPage.getByText(questionText)).toBeVisible();
    await expect(loggedOutPage.getByText(replyText)).toBeVisible();
    await loggedOutContext.close();
  });

  test("unverified user is blocked from applying, with no application created", async ({
    page,
  }) => {
    await login(page, unverifiedEmail);
    await page.goto(`/listing/${openPostingId}`);

    await page.getByLabel(/Message to @/).fill("Let me in");
    await page.getByRole("button", { name: "Apply for a slot" }).click();

    await expect(page.locator('p[role="alert"]')).toContainText(/verify your email/i);

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, openPostingId));
    expect(rows.filter((r) => r.status === "pending")).toHaveLength(0);
  });

  test("a full listing shows no apply form, for logged-out and logged-in visitors alike", async ({
    page,
  }) => {
    await page.goto(`/listing/${fullPostingId}`);
    await expect(page.getByText(/no open spots/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply for a slot" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Log in to apply" })).toHaveCount(0);

    await login(page, applicantEmail);
    await page.goto(`/listing/${fullPostingId}`);
    await expect(page.getByText(/no open spots/i)).toBeVisible();
  });

  test("the host sees no apply form on their own listing", async ({ page }) => {
    await login(page, hostEmail);
    await page.goto(`/listing/${openPostingId}`);
    await expect(page.getByText("This is your own listing.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply for a slot" })).toHaveCount(0);
  });

  test("an accepted applicant appears in the roster as a Member with no role label", async ({
    page,
  }) => {
    await page.goto(`/listing/${openPostingId}`);
    await expect(page.getByText(`@e2elistingaccepted${runId}`)).toBeVisible();
    await expect(page.getByText("Member", { exact: true })).toHaveCount(1);
    await expect(page.getByText(/Controller|Sentinel|Duelist|Entry.\/.Initiator|Flex/)).toHaveCount(0);
  });

  test("save and unsave a listing", async ({ page }) => {
    await login(page, applicantEmail);
    await page.goto(`/listing/${openPostingId}`);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();

    await page.getByRole("button", { name: "Saved ✓" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });
});
