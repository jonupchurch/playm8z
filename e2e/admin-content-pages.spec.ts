import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, users } from "@/db/schema";

// The table's content/actions (US1/US2/US3) can't be exercised end-to-
// end here: require-role.ts's rank check is currently hardcoded to
// reject every real session (no `role` column exists yet -- Admin
// Settings/024 adds it), the exact same gap every prior admin feature
// hits. `search-content-pages.ts`, `create-content-page.ts`, and
// `delete-content-page.ts` are already covered directly by their own
// unit/integration tests; this spec covers what's actually reachable
// through a real browser today: FR-001/SC-005's access-denial behavior
// for both an unauthenticated visitor and a logged-in ordinary user.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const verifiedEmail = `e2e-admin-content-pages-${runId}@example.com`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values({
    email: verifiedEmail,
    passwordHash,
    handle: `e2eadmincp${runId}`,
    emailVerified: new Date(),
  });
});

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, verifiedEmail));
});

test.describe("Admin Content Pages (quickstart.md Scenario 8, access control)", () => {
  test("an unauthenticated visitor is denied, not shown the page list", async ({ page }) => {
    const response = await page.goto("/admin/content-pages");
    expect(response?.status()).toBe(401);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("Content pages", { exact: true })).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("a logged-in but non-moderator user is denied, not shown the page list", async ({ page }) => {
    await login(page, verifiedEmail);

    const response = await page.goto("/admin/content-pages");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Access denied")).toBeVisible();
    await expect(page.getByText("Content pages", { exact: true })).not.toBeVisible();
  });
});

// The two bugs this covers, both reported against the shipped admin CMS:
//   1. A new page's URL was locked forever at the "untitled-page" slug
//      createContentPage generates -- no code path updated `slug` at all.
//   2. Delete only set status='draft', so on an already-draft page it was
//      a silent no-op and junk drafts could never be cleared.
// Both are now exercised through the real UI as a real admin, which the
// original spec couldn't do (its comment above predates Admin Settings'
// (024) real `role` column).
test.describe("Admin Content Pages -- create, rename, delete (real admin session)", () => {
  const adminEmail = `e2e-admin-cp-admin-${runId}@example.com`;
  const renamedSlug = `e2e-house-rules-${runId}`;
  let createdId: string | null = null;

  test.beforeAll(async () => {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await hash(password, 10),
      handle: `e2eadmincpadm${runId}`,
      emailVerified: new Date(),
      role: "admin",
    });
  });

  test.afterAll(async () => {
    // Belt and braces: the test deletes the page through the UI, but a
    // mid-run failure would leave it behind. Scoped to this run's own
    // renamed slug and the exact id it created -- never a blanket wipe of
    // "untitled-page", which is a slug a real local page could hold.
    await db.delete(contentPages).where(inArray(contentPages.slug, [renamedSlug]));
    if (createdId) await db.delete(contentPages).where(eq(contentPages.id, createdId));
    await db.delete(users).where(eq(users.email, adminEmail));
  });

  test("a new page can be renamed off /untitled-page, then really deleted", async ({ page }) => {
    const before = new Set((await db.select({ id: contentPages.id }).from(contentPages)).map((row) => row.id));

    await login(page, adminEmail);
    await page.goto("/admin/content-pages");
    await page.getByRole("button", { name: "New page" }).click();

    // .click() only awaits the event dispatch, not the Server Action
    // behind it, so poll for the real signal: a row id that wasn't there
    // before. Waiting on "Untitled page" being visible would be no signal
    // at all -- any environment that has ever clicked New page already has
    // leftover rows with that exact title, and the assertion would pass
    // instantly against one of those while the new insert was still in
    // flight.
    let created: { id: string; slug: string } | undefined;
    await expect
      .poll(
        async () => {
          const rows = await db.select({ id: contentPages.id, slug: contentPages.slug }).from(contentPages);
          created = rows.find((row) => !before.has(row.id));
          return created ? 1 : 0;
        },
        { message: "clicking New page should create exactly one row", timeout: 10_000 },
      )
      .toBe(1);

    createdId = created!.id;
    // The bug's starting condition: an auto-generated, un-editable slug.
    expect(created!.slug).toMatch(/^untitled-page(-\d+)?$/);

    // Rename it through the editor.
    await page.goto(`/pages/${created!.slug}`);
    await page.getByRole("button", { name: "Edit page" }).click();
    await page.getByLabel("Page title").fill("House Rules");
    await page.getByLabel("Page URL").fill(renamedSlug);
    await page.getByRole("button", { name: "Save changes" }).click();

    // The page moved: the editor follows it to the new URL...
    await expect(page).toHaveURL(`http://localhost:3000/pages/${renamedSlug}`);
    await expect(page.getByRole("heading", { name: "House Rules", level: 1 })).toBeVisible();
    // ...and the old one is genuinely gone, not a stale duplicate.
    expect((await page.goto(`/pages/${created!.slug}`))?.status()).toBe(404);

    // Now delete it for real. It's still a draft, which is precisely the
    // case the old soft-delete silently no-opped on.
    await page.goto("/admin/content-pages");
    // Scoped to this page's own row via its unique slug cell. A bare
    // getByTitle("Delete").last() picks whichever row sorts last (the
    // table is ordered by updatedAt desc, so a page just renamed is
    // FIRST) and would cheerfully delete an unrelated page.
    const row = page.getByText(`/${renamedSlug}`, { exact: true }).locator("..");
    await expect(row).toBeVisible();
    await row.getByTitle("Delete").click();
    await row.getByRole("button", { name: "Yes" }).click();

    await expect(page.getByText(`/${renamedSlug}`)).toHaveCount(0);
    expect(await db.select().from(contentPages).where(eq(contentPages.id, createdId!))).toHaveLength(0);
    createdId = null;
  });

  test("a system page offers no Delete, and its URL field is locked", async ({ page }) => {
    await login(page, adminEmail);

    await page.goto("/pages/about");
    await page.getByRole("button", { name: "Edit page" }).click();
    await expect(page.getByLabel("Page URL")).toBeDisabled();
    await expect(page.getByLabel("Page title")).toBeEnabled();
  });
});
