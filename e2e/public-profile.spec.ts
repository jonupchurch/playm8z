import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, follows, postings, reviews, userGames, users } from "@/db/schema";

// Unlike the admin/moderation cluster, this feature has no role-gate
// blocker (requireVerifiedEmail checks a real `emailVerified` column,
// not a hardcoded rank) -- every scenario here is exercised through
// real, independently-verified sessions, no local bypass needed.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";

const ownerHandle = `e2ppowner${runId}`;
const viewerHandle = `e2ppviewer${runId}`;
const mutualHandle = `e2ppmutual${runId}`;
const noPostingHandle = `e2ppnoposting${runId}`;

const ownerEmail = `e2e-pp-owner-${runId}@example.com`;
const viewerEmail = `e2e-pp-viewer-${runId}@example.com`;
const mutualEmail = `e2e-pp-mutual-${runId}@example.com`;
const noPostingEmail = `e2e-pp-noposting-${runId}@example.com`;
const unverifiedEmail = `e2e-pp-unverified-${runId}@example.com`;

let ownerId: string;
let viewerId: string;
let mutualId: string;
let ownerPostingId: string;
let viewerPostingId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);

  const [owner] = await db
    .insert(users)
    .values({
      email: ownerEmail,
      passwordHash,
      handle: ownerHandle,
      emailVerified: new Date(),
      bio: `Test bio for ${runId}`,
      avatarColor: "amber-orange",
      region: "na-west",
      ageGroup: "18",
      platforms: ["pc"],
    })
    .returning({ id: users.id });
  ownerId = owner.id;

  const [viewer] = await db
    .insert(users)
    .values({ email: viewerEmail, passwordHash, handle: viewerHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  viewerId = viewer.id;

  const [mutual] = await db
    .insert(users)
    .values({ email: mutualEmail, passwordHash, handle: mutualHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  mutualId = mutual.id;

  await db.insert(users).values({ email: noPostingEmail, passwordHash, handle: noPostingHandle, emailVerified: new Date() });
  await db.insert(users).values({ email: unverifiedEmail, passwordHash, handle: `e2ppunverified${runId}` });

  await db.insert(userGames).values([
    { userId: ownerId, game: "Valorant" },
    { userId: ownerId, game: "Helldivers 2" },
    { userId: viewerId, game: "Valorant" },
  ]);

  await db.insert(follows).values([
    { followerId: viewerId, followeeId: mutualId },
    { followerId: ownerId, followeeId: mutualId },
  ]);

  const [ownerPosting] = await db
    .insert(postings)
    .values({
      hostId: ownerId,
      game: "Valorant",
      title: `Owner's open party ${runId}`,
      blurb: "blurb",
      vibe: "casual",
      region: "na-west",
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  ownerPostingId = ownerPosting.id;

  const [viewerPosting] = await db
    .insert(postings)
    .values({
      hostId: viewerId,
      game: "Helldivers 2",
      title: `Viewer's own party ${runId}`,
      blurb: "blurb",
      vibe: "casual",
      region: "na-west",
      seatsTotal: 2,
      seatsOpen: 1,
      status: "open",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  viewerPostingId = viewerPosting.id;
});

test.afterAll(async () => {
  await db.delete(applications).where(eq(applications.postingId, viewerPostingId));
  await db.delete(applications).where(eq(applications.postingId, ownerPostingId));
  await db.delete(reviews).where(eq(reviews.revieweeId, ownerId));
  await db.delete(follows).where(eq(follows.followeeId, mutualId));
  await db.delete(userGames).where(eq(userGames.userId, ownerId));
  await db.delete(userGames).where(eq(userGames.userId, viewerId));
  await db.delete(postings).where(eq(postings.id, ownerPostingId));
  await db.delete(postings).where(eq(postings.id, viewerPostingId));
  await db.delete(users).where(eq(users.email, ownerEmail));
  await db.delete(users).where(eq(users.email, viewerEmail));
  await db.delete(users).where(eq(users.email, mutualEmail));
  await db.delete(users).where(eq(users.email, noPostingEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

test.describe("Public Profile (quickstart.md Scenarios 1-2)", () => {
  test("public view for a logged-out visitor: identity/bio/stats/games/open postings/reviews, no dropped elements, axe clean", async ({
    page,
  }) => {
    const response = await page.goto(`/u/${ownerHandle}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: `@${ownerHandle}` })).toBeVisible();
    await expect(page.getByText(`Test bio for ${runId}`)).toBeVisible();
    await expect(page.getByText("Member since")).toBeVisible();
    await expect(page.getByText("Valorant").first()).toBeVisible();
    await expect(page.getByText("Helldivers 2").first()).toBeVisible();
    await expect(page.getByText(`Owner's open party ${runId}`)).toBeVisible();
    await expect(page.getByText("No reviews yet.")).toBeVisible();
    await expect(page.getByText("sessions")).toBeVisible();

    // Dropped wireframe elements (research.md #1) -- never present.
    await expect(page.getByText("● Online")).toHaveCount(0);
    await expect(page.getByText(/\d+% reliable/)).toHaveCount(0);
    await expect(page.getByText("groups", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/level \d+/i)).toHaveCount(0);
    await expect(page.getByText("PRONOUNS")).toHaveCount(0);
    await expect(page.getByText("LANGUAGES")).toHaveCount(0);

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("404s for a nonexistent handle", async ({ page }) => {
    const response = await page.goto(`/u/no-such-handle-${runId}`);
    expect(response?.status()).toBe(404);
  });
});

test.describe("Public Profile (quickstart.md Scenarios 3-7, authenticated actions)", () => {
  test("Follow toggles to Following and back", async ({ page }) => {
    await login(page, viewerEmail);
    await page.goto(`/u/${ownerHandle}`);

    await page.getByRole("button", { name: "Follow" }).click();
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

    await page.getByRole("button", { name: "Following" }).click();
    await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  });

  test("Message opens/starts a conversation with the profile owner", async ({ page }) => {
    await login(page, viewerEmail);
    await page.goto(`/u/${ownerHandle}`);

    await page.getByRole("button", { name: "Message" }).click();
    await page.waitForURL(/\/inbox\/[0-9a-f-]+/);
  });

  test("a visitor with no eligible open posting sees Invite disabled, not a dead click", async ({ page }) => {
    await login(page, noPostingEmail);
    await page.goto(`/u/${ownerHandle}`);

    await expect(page.getByRole("button", { name: "Invite to a party" })).toBeDisabled();
    await expect(page.getByText("Host an open party with a free seat to invite this player.")).toBeVisible();
  });

  test("Invite to a party creates a pending, host-initiated request the profile owner can accept", async ({ page }) => {
    await login(page, viewerEmail);
    await page.goto(`/u/${ownerHandle}`);

    await page.getByRole("button", { name: "Invite to a party" }).click();
    await page.getByRole("menuitem", { name: /Viewer's own party/ }).click();
    await expect(page.getByText("Invited ✓")).toBeVisible();

    const [invite] = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, viewerPostingId));
    expect(invite.applicantId).toBe(ownerId);
    expect(invite.initiatedBy).toBe("host");
    expect(invite.status).toBe("pending");

    // Switch sessions: the PROFILE OWNER is the one who decides this,
    // not the inviting viewer -- FR-006. The owner's inbox also has a
    // real, unrelated conversation with the same viewer from the
    // earlier "Message" scenario -- scope the locator to the specific
    // invite row (its own unique preview text) rather than the shared
    // "@handle" text both rows legitimately show.
    await login(page, ownerEmail);
    await page.goto("/inbox");
    const inviteRow = page.getByRole("link", { name: /Invited you to join their party/ });
    await expect(inviteRow).toBeVisible();
    await inviteRow.click();

    await expect(page.getByText(`@${viewerHandle} invited you to their party`)).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();
    // The URL before this click is already /inbox/{applicationId}, which
    // also matches a generic UUID-path regex -- wait for navigation AWAY
    // from the application id specifically, not just "any inbox URL",
    // or the DB checks below can race ahead of the accept actually
    // completing.
    await page.waitForURL((url) => !url.pathname.endsWith(invite.id));

    const [accepted] = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, viewerPostingId));
    expect(accepted.status).toBe("accepted");

    const [updatedPosting] = await db.select().from(postings).where(eq(postings.id, viewerPostingId));
    expect(updatedPosting.seatsOpen).toBe(0);
    expect(updatedPosting.status).toBe("full");
  });
});

test.describe("Public Profile (quickstart.md Scenarios 8-9)", () => {
  test("You have in common shows accurate mutual follows and shared games, absent for self/logged-out", async ({ page, browser }) => {
    await login(page, viewerEmail);
    await page.goto(`/u/${ownerHandle}`);

    await expect(page.getByText("1 mutual follow")).toBeVisible();
    await expect(page.getByText("Valorant", { exact: true }).last()).toBeVisible();

    await login(page, ownerEmail);
    await page.goto(`/u/${ownerHandle}`);
    await expect(page.getByText("You have in common")).toHaveCount(0);

    // A genuinely separate browser context, not just this page's
    // cookies cleared -- Listing detail's (006) own established finding
    // that `next dev`'s weaker Cache-Control can let Chromium reuse a
    // cached response across a same-context cookie change.
    const loggedOutContext = await browser.newContext();
    const loggedOutPage = await loggedOutContext.newPage();
    await loggedOutPage.goto(`/u/${ownerHandle}`);
    await expect(loggedOutPage.getByText("You have in common")).toHaveCount(0);
    await loggedOutContext.close();
  });

  test("Report user and Block user reuse the canonical report/block flows", async ({ page }) => {
    await login(page, viewerEmail);
    await page.goto(`/u/${ownerHandle}`);

    await page.getByRole("button", { name: "More profile actions" }).click();
    await page.getByRole("menuitem", { name: "⚑ Report user" }).click();
    await expect(page.getByRole("heading", { name: "Report" })).toBeVisible();
    await expect(page.getByText(`@${ownerHandle}`).last()).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "More profile actions" }).click();
    await page.getByRole("menuitem", { name: "⛔ Block user" }).click();
    await expect(page.getByRole("heading", { name: "Confirm block" })).toBeVisible();
  });
});

test.describe("Public Profile (quickstart.md Scenario 10, gating)", () => {
  test("an unauthenticated visitor is routed to log in when attempting Follow", async ({ page }) => {
    await page.goto(`/u/${ownerHandle}`);
    await page.getByRole("link", { name: "Follow" }).click();
    await page.waitForURL(/\/login/);
  });

  test("an unverified session sees a verify-your-email message when attempting Follow", async ({ page }) => {
    await login(page, unverifiedEmail);
    await page.goto(`/u/${ownerHandle}`);
    await page.getByRole("button", { name: "Follow" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/verify your email/i);
  });
});
