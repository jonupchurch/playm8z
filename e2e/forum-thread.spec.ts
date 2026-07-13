import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const authorEmail = `e2e-thread-author-${runId}@example.com`;
const authorHandle = `e2ethreadauthor${runId}`;
const verifiedEmail = `e2e-thread-verified-${runId}@example.com`;

const threadTitle = `Meta debate ${runId}`;
const oldReplyBody = `Oldest reply ${runId}`;
const newReplyBody = `Newest reply ${runId}`;
const topReplyBody = `Most liked reply ${runId}`;

let authorId: string;
let threadId: string;
let oldReplyId: string;
let topReplyId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

async function getViewCount(): Promise<number> {
  const [row] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
  return row.viewCount;
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [author] = await db
    .insert(users)
    .values({ email: authorEmail, handle: authorHandle, region: "eu-west" })
    .returning({ id: users.id });
  authorId = author.id;

  await db.insert(users).values({
    email: verifiedEmail,
    passwordHash,
    handle: `e2ethreadverified${runId}`,
    emailVerified: new Date(),
  });

  const [thread] = await db
    .insert(forumThreads)
    .values({
      authorId,
      categoryId: "gametalk",
      title: threadTitle,
      body: "With the latest patch, is double-controller back on top?",
      tags: [`tag-${runId}`],
    })
    .returning({ id: forumThreads.id });
  threadId = thread.id;

  const [oldReply] = await db
    .insert(forumReplies)
    .values({ threadId, authorId, body: oldReplyBody, likes: 1, createdAt: new Date(Date.now() - 60 * 60_000) })
    .returning({ id: forumReplies.id });
  oldReplyId = oldReply.id;

  await db
    .insert(forumReplies)
    .values({ threadId, authorId, body: newReplyBody, likes: 2, createdAt: new Date(Date.now() - 5 * 60_000) });

  const [topReply] = await db
    .insert(forumReplies)
    .values({ threadId, authorId, body: topReplyBody, likes: 50, createdAt: new Date(Date.now() - 30 * 60_000) })
    .returning({ id: forumReplies.id });
  topReplyId = topReply.id;

  await db.update(forumThreads).set({ replyCount: 3 }).where(eq(forumThreads.id, threadId));
});

test.afterAll(async () => {
  await db.delete(reports).where(eq(reports.targetId, threadId));
  await db.delete(reports).where(eq(reports.targetId, topReplyId));
  await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.email, authorEmail));
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Forum Thread (quickstart.md Scenarios 1-3)", () => {
  test("reads a thread as a logged-out visitor, with axe-core clean, and sort/right-rail/view-count all work", async ({
    page,
  }) => {
    const response = await page.goto(`/forum/thread/${threadId}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: threadTitle })).toBeVisible();
    await expect(page.getByText("OP").first()).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    // Sort: Top puts the most-liked reply first; Oldest puts the
    // earliest-created reply first; Newest puts the latest first.
    await page.locator("label", { hasText: "Oldest" }).click();
    const oldestOrder = await page.locator("p").allTextContents();
    expect(oldestOrder.findIndex((t) => t.includes(oldReplyBody))).toBeLessThan(
      oldestOrder.findIndex((t) => t.includes(newReplyBody)),
    );

    await page.locator("label", { hasText: "Newest" }).click();
    const newestOrder = await page.locator("p").allTextContents();
    expect(newestOrder.findIndex((t) => t.includes(newReplyBody))).toBeLessThan(
      newestOrder.findIndex((t) => t.includes(oldReplyBody)),
    );

    await page.locator("label", { hasText: "Top" }).click();
    const topOrder = await page.locator("p").allTextContents();
    expect(topOrder.findIndex((t) => t.includes(topReplyBody))).toBeLessThan(
      topOrder.findIndex((t) => t.includes(oldReplyBody)),
    );

    // Right rail: accurate thread info.
    await expect(page.getByText(`@${authorHandle}`).first()).toBeVisible();
    await expect(page.getByText("Thread info")).toBeVisible();
    await expect(page.getByText("Replies", { exact: true })).toBeVisible();

    // View count increments on reload.
    const viewsBefore = await getViewCount();
    await page.reload();
    const viewsAfter = await getViewCount();
    expect(viewsAfter).toBeGreaterThan(viewsBefore);
  });

  test("a verified user replies, quotes an existing reply, and a logged-out attempt is routed to log in", async ({
    page,
  }) => {
    await login(page, verifiedEmail);
    await page.goto(`/forum/thread/${threadId}`);

    const freshReplyBody = `Fresh reply from e2e ${runId}`;
    await page.locator("#reply-composer-body").fill(freshReplyBody);
    await page.getByRole("button", { name: "Post reply" }).click();

    await expect(async () => {
      await page.reload();
      await expect(page.getByText(freshReplyBody)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    const [threadRow] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(threadRow.replyCount).toBe(4);

    // Quote the original oldest reply.
    const oldReplyCard = page.locator("div").filter({ hasText: oldReplyBody }).last();
    await oldReplyCard.getByRole("button", { name: "Quote" }).click();
    await expect(page.getByText(`Quoting @${authorHandle}`)).toBeVisible();

    const quotingBody = `Quoting your point ${runId}`;
    await page.locator("#reply-composer-body").fill(quotingBody);
    await page.getByRole("button", { name: "Post reply" }).click();

    await expect(async () => {
      await page.reload();
      await expect(page.getByText(quotingBody)).toBeVisible({ timeout: 1000 });
      await expect(page.getByText(`@${authorHandle} wrote`)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    const [quotingRow] = await db.select().from(forumReplies).where(eq(forumReplies.body, quotingBody));
    expect(quotingRow.quotedReplyId).toBe(oldReplyId);

    // A genuinely fresh, unauthenticated context -- not
    // page.context().clearCookies(), which is vulnerable to a
    // confirmed dev-mode-only Chromium HTTP-cache artifact when reused
    // within the same browser context.
    const loggedOutContext = await page.context().browser()!.newContext();
    const loggedOutPage = await loggedOutContext.newPage();
    await loggedOutPage.goto(`/forum/thread/${threadId}`);
    await loggedOutPage.getByRole("link", { name: "Log in to reply" }).click();
    await expect(loggedOutPage).toHaveURL(/\/login/);
    await loggedOutContext.close();
  });

  test("a verified user likes/unlikes the original post and reports a reply", async ({ page }) => {
    await login(page, verifiedEmail);
    await page.goto(`/forum/thread/${threadId}`);

    const opLikeButton = page.getByRole("button", { name: "Like" }).first();
    await expect(opLikeButton).toHaveText(/^▲\s*0$/);
    await opLikeButton.click();
    await expect(page.getByRole("button", { name: "Unlike" }).first()).toHaveText(/^▲\s*1$/);

    await page.getByRole("button", { name: "Unlike" }).first().click();
    await expect(page.getByRole("button", { name: "Like" }).first()).toHaveText(/^▲\s*0$/);

    const [threadRow] = await db.select().from(forumThreads).where(eq(forumThreads.id, threadId));
    expect(threadRow.likes).toBe(0);

    // Report the top reply.
    const topReplyCard = page.locator("div").filter({ hasText: topReplyBody }).last();
    await topReplyCard.getByRole("button", { name: "Report" }).click();
    await expect(topReplyCard.getByRole("button", { name: "Reported" })).toBeVisible();

    const [reportRow] = await db.select().from(reports).where(eq(reports.targetId, topReplyId));
    expect(reportRow).toBeDefined();
    expect(reportRow.targetType).toBe("forum");
  });
});
