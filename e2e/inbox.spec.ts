import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, blocks, conversations, messages, postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";

const aEmail = `e2e-inbox-a-${runId}@example.com`;
const aHandle = `e2einboxa${runId}`;
const bEmail = `e2e-inbox-b-${runId}@example.com`;
const bHandle = `e2einboxb${runId}`;
const cEmail = `e2e-inbox-c-${runId}@example.com`;
const cHandle = `e2einboxc${runId}`;
const dEmail = `e2e-inbox-d-${runId}@example.com`;
const dHandle = `e2einboxd${runId}`;
const blockedEmail = `e2e-inbox-blocked-${runId}@example.com`;
const blockedHandle = `e2einboxblocked${runId}`;
const fEmail = `e2e-inbox-f-${runId}@example.com`;
const fHandle = `e2einboxf${runId}`;

const applicationMessage = `Let me join your party ${runId}`;

let aId: string;
let bId: string;
let cId: string;
let dId: string;
let blockedId: string;
let fId: string;
let postingId: string;
let applicationId: string;
let declinePostingId: string;
let declineApplicationId: string;
let directConversationId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);

  const [a] = await db
    .insert(users)
    .values({ email: aEmail, passwordHash, handle: aHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  aId = a.id;

  const [b] = await db
    .insert(users)
    .values({ email: bEmail, passwordHash, handle: bHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  bId = b.id;

  const [c] = await db
    .insert(users)
    .values({ email: cEmail, passwordHash, handle: cHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  cId = c.id;

  const [d] = await db
    .insert(users)
    .values({ email: dEmail, passwordHash, handle: dHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  dId = d.id;

  const [blocked] = await db
    .insert(users)
    .values({ email: blockedEmail, passwordHash, handle: blockedHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  blockedId = blocked.id;

  const [f] = await db
    .insert(users)
    .values({ email: fEmail, passwordHash, handle: fHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  fId = f.id;

  await db.insert(blocks).values({ blockerId: aId, blockedId });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: aId,
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

  const [application] = await db
    .insert(applications)
    .values({ postingId, applicantId: bId, message: applicationMessage, status: "pending" })
    .returning({ id: applications.id });
  applicationId = application.id;

  const [declinePosting] = await db
    .insert(postings)
    .values({
      hostId: aId,
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
    .values({ postingId: declinePostingId, applicantId: fId, message: "Also let me in", status: "pending" })
    .returning({ id: applications.id });
  declineApplicationId = declineApplication.id;

  const [directConversation] = await db
    .insert(conversations)
    .values({ memberIds: [aId, cId], lastMessageAt: new Date(Date.now() - 5 * 60_000) })
    .returning({ id: conversations.id });
  directConversationId = directConversation.id;

  await db.insert(messages).values({
    conversationId: directConversationId,
    senderId: cId,
    body: `Hey, want to team up? ${runId}`,
    createdAt: new Date(Date.now() - 5 * 60_000),
  });

  const [groupConversation] = await db
    .insert(conversations)
    .values({ isGroup: true, memberIds: [aId, cId, dId], lastMessageAt: new Date(Date.now() - 60 * 60_000) })
    .returning({ id: conversations.id });

  await db.insert(messages).values([
    {
      conversationId: groupConversation.id,
      senderId: cId,
      body: `First from C ${runId}`,
      createdAt: new Date(Date.now() - 3 * 60_000),
    },
    {
      conversationId: groupConversation.id,
      senderId: cId,
      body: `Second from C ${runId}`,
      createdAt: new Date(Date.now() - 2 * 60_000),
    },
    {
      conversationId: groupConversation.id,
      senderId: dId,
      body: `From D ${runId}`,
      createdAt: new Date(Date.now() - 60_000),
    },
  ]);
});

test.afterAll(async () => {
  await db.delete(messages).where(eq(messages.conversationId, directConversationId));
  await db.delete(conversations).where(eq(conversations.id, directConversationId));
  await db.delete(applications).where(eq(applications.postingId, postingId));
  await db.delete(applications).where(eq(applications.postingId, declinePostingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(postings).where(eq(postings.id, declinePostingId));
  await db.delete(blocks).where(eq(blocks.blockerId, aId));
  await db.delete(users).where(eq(users.email, aEmail));
  await db.delete(users).where(eq(users.email, bEmail));
  await db.delete(users).where(eq(users.email, cEmail));
  await db.delete(users).where(eq(users.email, dEmail));
  await db.delete(users).where(eq(users.email, blockedEmail));
  await db.delete(users).where(eq(users.email, fEmail));
});

test.describe("Inbox / messaging (quickstart.md Scenarios 1-3)", () => {
  test("unauthenticated visitors are routed to log in", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login/);
  });

  test("reads the merged list, searches it, sends a message, and shows group sender-grouping", async ({ page }) => {
    await login(page, aEmail);
    await page.goto("/inbox");

    // C appears in both the direct conversation row and the group
    // conversation's combined name -- scope to the direct row alone by
    // excluding D, which only appears in the group's name.
    const directRowWithC = page.locator("nav a").filter({ hasText: `@${cHandle}` }).filter({ hasNotText: dHandle });

    await expect(page.getByText(`@${bHandle}`)).toBeVisible();
    // Public Profile (022) fixed a real bug here: the list row's
    // preview text was hardcoded to a generic "Wants to join your
    // party" for every request-kind item, silently discarding the
    // applicant's own message. It now shows the real message.
    await expect(page.getByText(applicationMessage).first()).toBeVisible();
    await expect(directRowWithC).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByPlaceholder("Search messages…").fill(cHandle);
    await expect(directRowWithC).toBeVisible();
    await expect(page.getByText(`@${bHandle}`)).not.toBeVisible();
    await page.getByPlaceholder("Search messages…").fill("");

    await directRowWithC.click();
    await expect(page).toHaveURL(new RegExp(`/inbox/${directConversationId}`));

    const freshMessage = `Absolutely, let's dive ${runId}`;
    const composer = page.locator("#message-composer-body");
    await composer.fill(freshMessage);
    await page.getByRole("button", { name: "Send" }).click();

    // The composer's own (still-pending) value would otherwise satisfy
    // a plain getByText(freshMessage) match before the send resolves --
    // wait for it to clear (send-succeeded signal) before checking for
    // the rendered message bubble specifically. Also scope to the
    // message thread's own aria-live region, not the whole page: once
    // the send resolves, the conversation list's sidebar preview text
    // *also* updates to the same fresh message, so an unscoped
    // getByText matches both and hits a strict-mode violation -- a
    // real, timing-dependent race this test's own assertion could
    // always have hit, caught by a slower CI runner (found 2026-07-14).
    await expect(composer).toHaveValue("");
    const messageThread = page.locator('[aria-live="polite"]');
    await expect(messageThread.getByText(freshMessage)).toBeVisible();

    const [messageRow] = await db
      .select()
      .from(messages)
      .where(eq(messages.body, freshMessage));
    expect(messageRow).toBeDefined();
    expect(messageRow.senderId).toBe(aId);
  });

  test("groups consecutive same-sender messages in a group chat, showing the sender's name once", async ({
    page,
  }) => {
    await login(page, aEmail);
    await page.goto("/inbox");
    await page.getByText("Group ·").click();
    await expect(page.getByText(`From D ${runId}`)).toBeVisible();

    // Two consecutive messages from C collapse into a single sender
    // label; D's single message gets its own label -- exact-text match
    // avoids matching the conversation list's combined "@c, @d" name.
    await expect(page.getByText(`@${cHandle}`, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`@${dHandle}`, { exact: true })).toHaveCount(1);
  });

  test("starts a new direct conversation and a new group conversation via compose, excluding a blocked user", async ({
    page,
  }) => {
    await login(page, aEmail);
    await page.goto("/inbox");

    // Scoped to the dialog throughout -- a bare page-wide getByText for
    // a handle would also match the sidebar's group conversation row
    // (its combined "@c, @d" name contains each member's handle as a
    // substring), which sits behind the open modal.
    let dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "New" }).click();
    await expect(dialog.getByRole("heading", { name: "New message" })).toBeVisible();

    await dialog.getByPlaceholder("Search players…").fill(blockedHandle);
    await expect(dialog.getByText(`@${blockedHandle}`)).not.toBeVisible();

    await dialog.getByPlaceholder("Search players…").fill(dHandle);
    await dialog.getByText(`@${dHandle}`).click();
    await dialog.getByRole("button", { name: "Start chat" }).click();

    await expect(page).toHaveURL(/\/inbox\/[0-9a-f-]{36}/);

    const directWithD = await db
      .select()
      .from(conversations)
      .where(eq(conversations.isGroup, false));
    const newDirect = directWithD.find((c) => c.memberIds.includes(dId) && c.memberIds.includes(aId));
    expect(newDirect).toBeDefined();
    if (newDirect) await db.delete(conversations).where(eq(conversations.id, newDirect.id));

    await page.goto("/inbox");
    dialog = page.getByRole("dialog");
    await page.getByRole("button", { name: "New" }).click();
    await dialog.getByPlaceholder("Search players…").fill(cHandle);
    await dialog.getByText(`@${cHandle}`).click();
    await dialog.getByPlaceholder("Search players…").fill(fHandle);
    await dialog.getByText(`@${fHandle}`).click();
    await dialog.getByRole("button", { name: "Start group chat" }).click();

    await expect(page).toHaveURL(/\/inbox\/[0-9a-f-]{36}/);

    const groupRows = await db.select().from(conversations).where(eq(conversations.isGroup, true));
    const newGroup = groupRows.find(
      (c) => c.memberIds.includes(cId) && c.memberIds.includes(fId) && c.memberIds.includes(aId),
    );
    expect(newGroup).toBeDefined();
    if (newGroup) await db.delete(conversations).where(eq(conversations.id, newGroup.id));
  });

  test("accepts a pending request: seats decrement, a conversation is created, and the applicant joins the roster", async ({
    page,
  }) => {
    await login(page, aEmail);
    await page.goto(`/inbox/${applicationId}`);

    await expect(page.getByText("wants to join your party").first()).toBeVisible();
    // The real message now shows in both the list row's own preview
    // (022's fix) and the detail pane's message bubble -- scope to the
    // bubble, the last of the two matches in DOM order.
    await expect(page.getByText(applicationMessage).last()).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Accept" }).click();

    await page.waitForURL((url) => !url.pathname.includes(applicationId), { timeout: 5000 });
    expect(page.url()).toMatch(/\/inbox\/[0-9a-f-]{36}/);
    expect(page.url()).not.toContain(applicationId);

    const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
    expect(application.status).toBe("accepted");

    const [posting] = await db.select().from(postings).where(eq(postings.id, postingId));
    expect(posting.seatsOpen).toBe(1);

    await page.goto(`/listing/${postingId}`);
    await expect(page.getByText(`@${bHandle}`)).toBeVisible();
    await expect(page.getByText("Member")).toBeVisible();
  });

  test("declines a pending request: no seat change, no conversation, and the request drops off the list", async ({
    page,
  }) => {
    await login(page, aEmail);
    await page.goto(`/inbox/${declineApplicationId}`);

    await page.getByRole("button", { name: "Decline" }).click();
    await expect(page).toHaveURL("http://localhost:3000/inbox");

    const [application] = await db.select().from(applications).where(eq(applications.id, declineApplicationId));
    expect(application.status).toBe("declined");

    const [posting] = await db.select().from(postings).where(eq(postings.id, declinePostingId));
    expect(posting.seatsOpen).toBe(3);

    await expect(page.getByText(`@${fHandle}`)).not.toBeVisible();
  });
});
