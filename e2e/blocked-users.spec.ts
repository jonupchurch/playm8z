import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const mainEmail = `e2e-blocks-main-${runId}@example.com`;
const targetBEmail = `e2e-blocks-b-${runId}@example.com`;
const targetCEmail = `e2e-blocks-c-${runId}@example.com`;
const targetDEmail = `e2e-blocks-d-${runId}@example.com`;

const targetBHandle = `e2eblockb${runId}`;
const targetCHandle = `e2eblockc${runId}`;
const targetDHandle = `e2eblockd${runId}`;

let mainUserId: string;
let targetBId: string;
let targetCId: string;
let targetDId: string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  const [mainUser] = await db
    .insert(users)
    .values({ email: mainEmail, passwordHash, handle: `e2eblockmain${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  mainUserId = mainUser.id;

  const [targetB] = await db
    .insert(users)
    .values({ email: targetBEmail, handle: targetBHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  targetBId = targetB.id;

  const [targetC] = await db
    .insert(users)
    .values({ email: targetCEmail, handle: targetCHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  targetCId = targetC.id;

  const [targetD] = await db
    .insert(users)
    .values({ email: targetDEmail, handle: targetDHandle, emailVerified: new Date() })
    .returning({ id: users.id });
  targetDId = targetD.id;

  // Scenario 1 assumes an existing block, seeded directly per quickstart.md.
  await db.insert(blocks).values({ blockerId: mainUserId, blockedId: targetBId });
});

test.afterAll(async () => {
  await db.delete(reports).where(eq(reports.reporterId, mainUserId));
  await db.delete(blocks).where(eq(blocks.blockerId, mainUserId));
  await db.delete(users).where(eq(users.email, mainEmail));
  await db.delete(users).where(eq(users.email, targetBEmail));
  await db.delete(users).where(eq(users.email, targetCEmail));
  await db.delete(users).where(eq(users.email, targetDEmail));
});

test.describe("Blocked Users (quickstart.md Scenarios 1-2)", () => {
  test("views, searches, and unblocks a blocked user; both empty states render", async ({ page }) => {
    await login(page, mainEmail);
    await page.goto("/profile/account/blocked");

    await expect(page.getByText("1 person blocked")).toBeVisible();
    await expect(page.getByText(`@${targetBHandle}`)).toBeVisible();

    const searchInput = page.getByLabel("Search blocked users");
    await searchInput.fill("no-such-user-at-all");
    await expect(page.getByText(/No blocked users match/)).toBeVisible();
    await expect(page.getByText(`@${targetBHandle}`)).toHaveCount(0);

    await searchInput.fill("");
    await expect(page.getByText(`@${targetBHandle}`)).toBeVisible();

    await page.getByRole("button", { name: "Unblock" }).click();
    const unblockDialog = page.getByRole("dialog");
    await expect(unblockDialog.getByRole("heading", { name: `Unblock @${targetBHandle}?` })).toBeVisible();

    const unblockScan = await new AxeBuilder({ page }).analyze();
    expect(unblockScan.violations).toEqual([]);

    await unblockDialog.getByRole("button", { name: "Unblock", exact: true }).click();

    await expect(async () => {
      await page.reload();
      await expect(page.getByText("No blocked users")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    await expect(page.getByText("You haven't blocked anyone")).toBeVisible();
    await expect(page.getByRole("button", { name: "Block a user" }).first()).toBeVisible();

    const [row] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, mainUserId), eq(blocks.blockedId, targetBId)));
    expect(row.unblockedAt).not.toBeNull();
  });

  test("blocks a new user via the Block modal, with and without 'Also report'", async ({ page }) => {
    await login(page, mainEmail);
    await page.goto("/profile/account/blocked");
    await expect(page.getByText("No blocked users")).toBeVisible();

    // --- Block C, without reporting ---
    await page.getByRole("button", { name: "Block a user" }).first().click();
    await expect(page.getByRole("heading", { name: "Block a user" })).toBeVisible();

    const pickScan = await new AxeBuilder({ page }).analyze();
    expect(pickScan.violations).toEqual([]);

    await page.getByPlaceholder("Search players to block…").fill(targetCHandle);
    await page.getByRole("button", { name: new RegExp(`@${targetCHandle}`) }).click();
    await expect(page.getByRole("heading", { name: "Confirm block" })).toBeVisible();

    const confirmScan = await new AxeBuilder({ page }).analyze();
    expect(confirmScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Block user" }).click();
    // Scoped to <span> -- the dialog's own confirm step also rendered
    // "@handle" (in a <b>) and stays in the closed <dialog>'s DOM
    // (hidden, not unmounted), which would otherwise make a plain
    // getByText ambiguous between the row and the just-closed dialog.
    await expect(page.locator("span").filter({ hasText: `@${targetCHandle}` })).toBeVisible();
    const cRow = page.locator("div").filter({ has: page.locator("span", { hasText: `@${targetCHandle}` }) }).last();
    await expect(cRow.getByText("Reported")).toHaveCount(0);

    const [cBlockRow] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, mainUserId), eq(blocks.blockedId, targetCId)));
    expect(cBlockRow).toBeDefined();
    expect(cBlockRow.unblockedAt).toBeNull();

    // --- Block D, with reporting ---
    await page.getByRole("button", { name: "Block a user" }).click();
    await page.getByPlaceholder("Search players to block…").fill(targetDHandle);
    await page.getByRole("button", { name: new RegExp(`@${targetDHandle}`) }).click();
    await page.getByLabel("Also report this user to moderators").check();
    await page.getByRole("button", { name: "Block & report" }).click();

    const dRow = page.locator("div").filter({ has: page.locator("span", { hasText: `@${targetDHandle}` }) }).last();
    await expect(dRow.getByText("Reported")).toBeVisible();

    await expect(page.getByText("2 people blocked")).toBeVisible();

    const reportRows = await db.select().from(reports).where(eq(reports.targetId, targetDId));
    expect(reportRows).toHaveLength(1);
    expect(reportRows[0].targetType).toBe("user");
    expect(reportRows[0].reporterId).toBe(mainUserId);

    // Already-blocked C no longer appears as a candidate.
    await page.getByRole("button", { name: "Block a user" }).click();
    await page.getByPlaceholder("Search players to block…").fill(targetCHandle);
    await expect(page.getByText("No players found.")).toBeVisible();
  });
});
