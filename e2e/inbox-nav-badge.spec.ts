import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { applications, conversations, messages, postings, users } from "@/db/schema";
import { db } from "@/db";

// 037: the top-nav Messages entry + unread badge. US1 = the entry's
// presence (one click to inbox, dropdown de-duped, signed-in only);
// US2 = the badge's accuracy (counts unread messages, clears on read,
// excludes party requests -- those live in the bell).
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";

const vEmail = `e2e-navbadge-v-${runId}@example.com`;
const vHandle = `navbadgev${runId}`;
const sEmail = `e2e-navbadge-s-${runId}@example.com`;
const sHandle = `navbadges${runId}`;
const wEmail = `e2e-navbadge-w-${runId}@example.com`;
const wHandle = `navbadgew${runId}`;
const rEmail = `e2e-navbadge-r-${runId}@example.com`;
const rHandle = `navbadger${runId}`;

let vId: string;
let sId: string;
let wId: string;
let rId: string;
let directConversationId: string;
let requestPostingId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
  // The root-layout SiteHeader (a server component) is rendered stale
  // from the pre-login session on the client-side post-login redirect --
  // it only reflects the new session after a full navigation. Force one
  // so the signed-in nav (Messages entry, bell, profile menu) is present.
  await page.goto("/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);

  const [v] = await db
    .insert(users)
    .values({ email: vEmail, passwordHash, handle: vHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  vId = v.id;
  const [s] = await db
    .insert(users)
    .values({ email: sEmail, passwordHash, handle: sHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  sId = s.id;
  const [w] = await db
    .insert(users)
    .values({ email: wEmail, passwordHash, handle: wHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  wId = w.id;
  const [r] = await db
    .insert(users)
    .values({ email: rEmail, passwordHash, handle: rHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  rId = r.id;

  // V has exactly one unread message from S (V never opened the thread,
  // so the threshold is the conversation's createdAt).
  const [direct] = await db
    .insert(conversations)
    .values({ memberIds: [vId, sId], createdAt: new Date(Date.now() - 10 * 60_000), lastMessageAt: new Date(Date.now() - 5 * 60_000) })
    .returning({ id: conversations.id });
  directConversationId = direct.id;
  await db.insert(messages).values({
    conversationId: directConversationId,
    senderId: sId,
    body: `Ping from S ${runId}`,
    createdAt: new Date(Date.now() - 5 * 60_000),
  });

  // W hosts a posting with a pending request from R and has NO
  // conversations -- so W's only "activity" is a party request.
  const [posting] = await db
    .insert(postings)
    .values({
      hostId: wId,
      game: `Deep Rock ${runId}`,
      title: `Rock and stone ${runId}`,
      blurb: "Mining run",
      vibe: "casual",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 3,
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
    })
    .returning({ id: postings.id });
  requestPostingId = posting.id;
  await db
    .insert(applications)
    .values({ postingId: requestPostingId, applicantId: rId, message: `Let me in ${runId}`, status: "pending" });
});

test.afterAll(async () => {
  await db.delete(messages).where(eq(messages.conversationId, directConversationId));
  await db.delete(conversations).where(eq(conversations.id, directConversationId));
  await db.delete(applications).where(eq(applications.postingId, requestPostingId));
  await db.delete(postings).where(eq(postings.id, requestPostingId));
  await db.delete(users).where(eq(users.email, vEmail));
  await db.delete(users).where(eq(users.email, sEmail));
  await db.delete(users).where(eq(users.email, wEmail));
  await db.delete(users).where(eq(users.email, rEmail));
});

test.describe("Messages nav entry + unread badge (037)", () => {
  test("US1: a signed-in member sees the Messages entry, reaches the inbox in one click, and the header is accessible", async ({
    page,
  }) => {
    await login(page, vEmail);

    const messagesLink = page.getByRole("link", { name: "Messages" });
    await expect(messagesLink).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await messagesLink.click();
    await expect(page).toHaveURL("http://localhost:3000/inbox");
  });

  test("US1: the account dropdown no longer offers a redundant Inbox link", async ({ page }) => {
    await login(page, vEmail);
    await page.getByRole("button", { name: `Account menu for @${vHandle}` }).click();

    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Inbox" })).toHaveCount(0);
  });

  test("US1: a signed-out visitor sees no Messages entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Messages" })).toHaveCount(0);
  });

  test("US2: the badge shows the unread count and clears after the conversation is read", async ({ page }) => {
    await login(page, vEmail);

    await expect(page.getByRole("link", { name: "Messages, 1 unread" })).toBeVisible();

    // Opening the conversation marks it read (a side effect of the
    // conversation page); a fresh render of any page then shows no badge.
    await page.goto(`/inbox/${directConversationId}`);
    // Scope to the message thread's aria-live region -- the same text
    // also appears in the sidebar conversation-list preview, which would
    // trip strict mode. Its visibility confirms the conversation page
    // rendered, and the page awaits markConversationRead before it does.
    await expect(page.locator('[aria-live="polite"]').getByText(`Ping from S ${runId}`)).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Messages", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Messages, \d+ unread/ })).toHaveCount(0);
  });

  test("US2: a pending party request is not counted in the Messages badge (it lives in the bell)", async ({ page }) => {
    await login(page, wEmail);

    // W has a pending request but zero messages: Messages badge is empty...
    await expect(page.getByRole("link", { name: "Messages", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Messages, \d+ unread/ })).toHaveCount(0);

    // ...while the notification bell reflects the request.
    await expect(page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible();
  });
});
