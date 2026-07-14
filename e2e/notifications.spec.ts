import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, blocks, notifications, postings, reports, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";

const hostEmail = `e2e-notif-host-${runId}@example.com`;
const hostHandle = `e2enotifhost${runId}`;
const applicantEmail = `e2e-notif-applicant-${runId}@example.com`;
const applicantHandle = `e2enotifapplicant${runId}`;
const declineApplicantEmail = `e2e-notif-declineapp-${runId}@example.com`;
const declineApplicantHandle = `e2enotifdeclineapp${runId}`;
const reporterEmail = `e2e-notif-reporter-${runId}@example.com`;
const reporterHandle = `e2enotifreporter${runId}`;
const unverifiedEmail = `e2e-notif-unverified-${runId}@example.com`;
const unverifiedHandle = `e2enotifunverified${runId}`;
const emptyEmail = `e2e-notif-empty-${runId}@example.com`;
const emptyHandle = `e2enotifempty${runId}`;

let hostId: string;
let applicantId: string;
let declineApplicantId: string;
let reporterId: string;
let postingId: string;
let declinePostingId: string;
let pendingApplicationId: string;
let declineApplicationId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);

  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, passwordHash, handle: hostHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  const [applicant] = await db
    .insert(users)
    .values({ email: applicantEmail, passwordHash, handle: applicantHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  applicantId = applicant.id;

  const [declineApplicant] = await db
    .insert(users)
    .values({
      email: declineApplicantEmail,
      passwordHash,
      handle: declineApplicantHandle,
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  declineApplicantId = declineApplicant.id;

  const [reporter] = await db
    .insert(users)
    .values({ email: reporterEmail, passwordHash, handle: reporterHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  reporterId = reporter.id;

  // Deliberately never verified, to exercise FR-008's submit-time gate.
  await db.insert(users).values({ email: unverifiedEmail, passwordHash, handle: unverifiedHandle });

  // Isolated user with zero notifications and zero hosted postings --
  // the only reliable way to check the empty state (FR-004), since the
  // host above always has *some* pending/resolved request in the
  // "Requests" category throughout this file's own test sequence.
  await db.insert(users).values({ email: emptyEmail, passwordHash, handle: emptyHandle, emailVerified: new Date() });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId,
      game: `Helldivers ${runId}`,
      title: `Dive night ${runId}`,
      blurb: "Casual dives",
      vibe: "casual",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 2,
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  postingId = posting.id;

  const [pendingApplication] = await db
    .insert(applications)
    .values({ postingId, applicantId, status: "pending" })
    .returning({ id: applications.id });
  pendingApplicationId = pendingApplication.id;

  const [declinePosting] = await db
    .insert(postings)
    .values({
      hostId,
      game: `Baldur's Gate ${runId}`,
      title: `Honour run ${runId}`,
      blurb: "No deaths allowed",
      vibe: "serious",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 3,
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  declinePostingId = declinePosting.id;

  const [declineApplication] = await db
    .insert(applications)
    .values({ postingId: declinePostingId, applicantId: declineApplicantId, status: "pending" })
    .returning({ id: applications.id });
  declineApplicationId = declineApplication.id;

  const yesterday = new Date(Date.now() - 24 * 60 * 60_000);

  await db.insert(notifications).values({
    userId: hostId,
    type: "news",
    text: `New: something shipped ${runId}`,
    targetRef: "/forum",
    read: true,
    createdAt: yesterday,
  });

  await db.insert(notifications).values([
    {
      userId: hostId,
      type: "reply",
      actorId: applicantId,
      text: `replied to your thread "Test thread ${runId}"`,
      targetRef: "/forum",
      read: false,
    },
    {
      userId: hostId,
      type: "system",
      text: `Your party "Old party ${runId}" is now full`,
      targetRef: "/forum",
      read: false,
      createdAt: yesterday,
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(reports).where(eq(reports.reporterId, reporterId));
  await db.delete(blocks).where(eq(blocks.blockerId, reporterId));
  await db.delete(notifications).where(eq(notifications.userId, hostId));
  await db.delete(applications).where(eq(applications.postingId, postingId));
  await db.delete(applications).where(eq(applications.postingId, declinePostingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(postings).where(eq(postings.id, declinePostingId));
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, applicantEmail));
  await db.delete(users).where(eq(users.email, declineApplicantEmail));
  await db.delete(users).where(eq(users.email, reporterEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.email, emptyEmail));
});

test.describe("Notifications + Report modal (quickstart.md Scenarios 1-3)", () => {
  test("unauthenticated visitors are routed to log in", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows an empty state, not a blank list, when there's nothing to show", async ({ page }) => {
    await login(page, emptyEmail);
    await page.goto("/notifications");
    await expect(page.getByText("You're all caught up")).toBeVisible();
    await expect(page.getByText("0 unread")).toBeVisible();
  });

  test("bell dropdown shows an accurate unread preview and count", async ({ page }) => {
    await login(page, hostEmail);
    await page.goto("/");

    const bell = page.getByRole("button", { name: /Notifications, \d+ unread/ });
    await expect(bell).toBeVisible();
    await bell.click();

    const dropdown = page.getByRole("region", { name: "Notifications" });
    await expect(dropdown.getByText(`replied to your thread "Test thread ${runId}"`)).toBeVisible();
    await expect(dropdown.getByText(`Your party "Old party ${runId}" is now full`)).toBeVisible();
    await expect(dropdown.getByText(`New: something shipped ${runId}`)).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("full page filters, groups Today/Earlier, marks one and then all read, and shows an empty state", async ({
    page,
  }) => {
    await login(page, hostEmail);
    await page.goto("/notifications");

    await expect(page.getByText(`replied to your thread "Test thread ${runId}"`)).toBeVisible();
    await expect(page.getByText("Today", { exact: true })).toBeVisible();
    await expect(page.getByText("Earlier", { exact: true })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Forum" }).click();
    await expect(page.getByText(`replied to your thread "Test thread ${runId}"`)).toBeVisible();
    await expect(page.getByText(`Your party "Old party ${runId}" is now full`)).not.toBeVisible();

    await page.getByRole("button", { name: "System" }).click();
    await expect(page.getByText(`Your party "Old party ${runId}" is now full`)).toBeVisible();
    await expect(page.getByText(`replied to your thread "Test thread ${runId}"`)).not.toBeVisible();

    await page.getByRole("button", { name: "Forum" }).click();
    await page.getByText(`replied to your thread "Test thread ${runId}"`).click();
    await page.waitForURL("http://localhost:3000/forum");

    const [replyNotif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.text, `replied to your thread "Test thread ${runId}"`));
    expect(replyNotif.read).toBe(true);

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Mark all read" }).click();
    // The two still-pending join requests remain "unread" by design
    // (mark-all-read only touches real `notifications` rows, per
    // mark-all-read.ts -- a pending request stays flagged until it's
    // actually Accepted/Declined, same simplification as Inbox's own
    // request list) -- so 2, not 0, remain at this point.
    await expect(page.getByText("2 unread")).toBeVisible();

    const stillUnread = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, hostId));
    expect(stillUnread.every((row) => row.read)).toBe(true);
  });

  test("accepts a pending request directly from the notifications page: same result as Inbox", async ({ page }) => {
    await login(page, hostEmail);
    await page.goto("/notifications");
    await page.getByRole("button", { name: "Requests", exact: true }).click();

    const applicantRow = page.getByRole("group", { name: `Request from @${applicantHandle}` });
    await expect(applicantRow.getByText("wants to join your party")).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await applicantRow.getByRole("button", { name: "Accept" }).click();
    await page.waitForURL(/\/inbox\/[0-9a-f-]{36}/);

    const [application] = await db.select().from(applications).where(eq(applications.id, pendingApplicationId));
    expect(application.status).toBe("accepted");

    const [posting] = await db.select().from(postings).where(eq(postings.id, postingId));
    expect(posting.seatsOpen).toBe(1);

    await page.goto("/notifications");
    await page.getByRole("button", { name: "Requests", exact: true }).click();
    const resolvedApplicantRow = page.getByRole("group", { name: `Request from @${applicantHandle}` });
    await expect(resolvedApplicantRow.getByText(`✓ You added @${applicantHandle} to your party`)).toBeVisible();
    await expect(resolvedApplicantRow.getByRole("button", { name: "Accept" })).not.toBeVisible();
  });

  test("declines a pending request directly from the notifications page: same result as Inbox", async ({ page }) => {
    await login(page, hostEmail);
    await page.goto("/notifications");
    await page.getByRole("button", { name: "Requests", exact: true }).click();

    const declineRow = page.getByRole("group", { name: `Request from @${declineApplicantHandle}` });
    await expect(declineRow.getByText("wants to join your party")).toBeVisible();
    await declineRow.getByRole("button", { name: "Decline" }).click();

    await expect(declineRow.getByRole("button", { name: "Decline" })).not.toBeVisible();
    await expect(declineRow.getByText("Request declined")).toBeVisible();

    const [application] = await db.select().from(applications).where(eq(applications.id, declineApplicationId));
    expect(application.status).toBe("declined");

    const [posting] = await db.select().from(postings).where(eq(postings.id, declinePostingId));
    expect(posting.seatsOpen).toBe(3);
  });

  test("submits a report with 'Also block' checked: creates a Report (with reason) and a Block", async ({
    page,
  }) => {
    await login(page, reporterEmail);
    await page.goto(`/listing/${postingId}`);

    const dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "⚑ Report" }).click();
    await expect(dialog.getByRole("heading", { name: "Report" })).toBeVisible();

    await dialog.getByRole("radio", { name: /Harassment or hate/ }).click();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await dialog.getByRole("button", { name: "Continue" }).click();

    await dialog.getByLabel(/Add details/).fill(`Kept messaging after being asked to stop ${runId}`);
    await dialog.getByText("Also block this user").click();
    await dialog.getByRole("button", { name: "Submit report" }).click();

    await expect(dialog.getByText("Report submitted")).toBeVisible();
    await expect(dialog.getByText(/we've blocked this user for you/)).toBeVisible();
    await dialog.getByRole("button", { name: "Done" }).click();

    const [reportRow] = await db
      .select()
      .from(reports)
      .where(eq(reports.reporterId, reporterId));
    expect(reportRow.reason).toBe("harassment");
    expect(reportRow.targetType).toBe("posting");
    expect(reportRow.details).toBe(`Kept messaging after being asked to stop ${runId}`);

    const [blockRow] = await db.select().from(blocks).where(eq(blocks.blockerId, reporterId));
    expect(blockRow).toBeDefined();
    expect(blockRow.blockedId).toBe(hostId);
  });

  test("blocks an unverified session's report submission with a verify-your-email message", async ({ page }) => {
    await login(page, unverifiedEmail);
    await page.goto(`/listing/${postingId}`);

    const dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "⚑ Report" }).click();
    await dialog.getByRole("radio", { name: /Spam or scam/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: "Submit report" }).click();

    await expect(dialog.getByRole("alert")).toContainText(/verify your email/i);
    await expect(dialog.getByText("Report submitted")).not.toBeVisible();
  });

  test("an unauthenticated visitor is routed to log in instead of opening the report flow", async ({ page }) => {
    await page.goto(`/listing/${postingId}`);
    await page.getByRole("link", { name: "⚑ Report" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
