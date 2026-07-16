import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { contentPages, users } from "@/db/schema";

// Covers the nav's "Pages" dropdown (custom pages only), the About
// top-level item, and the sitewide footer.
//
// contentPages is shared: the four real `system` pages are seeded for
// every environment (scripts/seed-system-pages.ts, a CI step), and
// content-page.spec.ts creates published custom pages of its own that
// legitimately appear in this dropdown too. So every dropdown assertion
// is "contains mine / excludes system", never an exact item count.
const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const memberEmail = `e2e-nav-member-${runId}@example.com`;
const adminEmail = `e2e-nav-admin-${runId}@example.com`;

const customSlug = `e2e-nav-custom-${runId}`;
const customTitle = `Speedrun Rules ${runId}`;
const draftSlug = `e2e-nav-draft-${runId}`;
const draftTitle = `Unfinished ${runId}`;

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
    { email: memberEmail, passwordHash, handle: `e2enavmember${runId}`, emailVerified: new Date() },
    { email: adminEmail, passwordHash, handle: `e2enavadmin${runId}`, emailVerified: new Date(), role: "admin" },
  ]);

  await db.insert(contentPages).values([
    { slug: customSlug, title: customTitle, status: "published", system: false, blocks: [{ type: "p", text: "No save states." }] },
    { slug: draftSlug, title: draftTitle, status: "draft", system: false, blocks: [{ type: "p", text: "Later." }] },
  ]);
});

test.afterAll(async () => {
  await db.delete(contentPages).where(inArray(contentPages.slug, [customSlug, draftSlug]));
  await db.delete(users).where(inArray(users.email, [memberEmail, adminEmail]));
});

test.describe("Pages dropdown", () => {
  test("lists published custom pages and opens one, for a logged-out visitor", async ({ page }) => {
    await page.goto("/browse");

    const trigger = page.getByRole("button", { name: "Pages", exact: true });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = page.getByRole("menu", { name: "Pages" });
    await menu.getByRole("menuitem", { name: customTitle }).click();

    await expect(page).toHaveURL(`http://localhost:3000/pages/${customSlug}`);
    await expect(page.getByRole("heading", { name: customTitle, level: 1 })).toBeVisible();
  });

  test("omits system pages, which have their own homes in the nav and footer", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: "Pages", exact: true }).click();

    const menu = page.getByRole("menu", { name: "Pages" });
    await expect(menu.getByRole("menuitem", { name: customTitle })).toBeVisible();
    for (const title of ["About Us", "Privacy Policy", "Terms of Use", "Cookies"]) {
      await expect(menu.getByRole("menuitem", { name: title, exact: true })).toHaveCount(0);
    }
  });

  test("omits draft pages, which /pages/[slug] would 404 for this visitor anyway", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: "Pages", exact: true }).click();

    const menu = page.getByRole("menu", { name: "Pages" });
    await expect(menu.getByRole("menuitem", { name: draftTitle })).toHaveCount(0);
    expect((await page.goto(`/pages/${draftSlug}`))?.status()).toBe(404);
  });

  test("closes on Escape", async ({ page }) => {
    await page.goto("/browse");
    const trigger = page.getByRole("button", { name: "Pages", exact: true });
    await trigger.click();
    await expect(page.getByRole("menu", { name: "Pages" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu", { name: "Pages" })).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("sits between News and Admin, and opening Admin closes it", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto("/browse");

    // Both dropdowns own their open state independently; the click-
    // outside handler is what keeps them from being open at once.
    await page.getByRole("button", { name: "Pages", exact: true }).click();
    await expect(page.getByRole("menu", { name: "Pages" })).toBeVisible();

    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await expect(page.getByRole("menu", { name: "Admin" })).toBeVisible();
    await expect(page.getByRole("menu", { name: "Pages" })).toHaveCount(0);

    // The actual requested placement: Pages between News and Admin,
    // with About immediately after it.
    const nav = page.getByRole("navigation", { name: "Main" });
    const labels = (await nav.locator(":scope > a, :scope > div > button").allInnerTexts()).map((label) =>
      label.replace("▾", "").trim(),
    );
    expect(labels).toEqual(["Browse", "Forum", "News", "Pages", "About", "Admin"]);
  });
});

test.describe("About nav item", () => {
  test("is a top-level link to the About system page", async ({ page }) => {
    await page.goto("/browse");

    const about = page.getByRole("link", { name: "About", exact: true });
    await expect(about).toBeVisible();
    await about.click();

    await expect(page).toHaveURL("http://localhost:3000/pages/about");
    await expect(page.getByRole("heading", { name: "About Us", level: 1 })).toBeVisible();
  });
});

test.describe("Sitewide footer", () => {
  test("shows the copyright and the three legal links, and Cookies resolves", async ({ page }) => {
    await page.goto("/browse");

    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/© \d{4} playm8z/)).toBeVisible();

    await expect(footer.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/pages/terms");
    await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/pages/privacy");

    await footer.getByRole("link", { name: "Cookies" }).click();
    await expect(page).toHaveURL("http://localhost:3000/pages/cookies");
    await expect(page.getByRole("heading", { name: "Cookies", level: 1 })).toBeVisible();
  });

  test("is hidden on the auth pages, which render their own centered shell", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
  });

  test("is hidden on the logged-out landing, which has its own richer footer", async ({ page }) => {
    await page.goto("/");
    // "Cookies" is unique to the sitewide footer, so its absence is the
    // direct proof this one stood down. (The contentinfo check backs it
    // up but is subtler than it looks: the landing's own <footer> is
    // nested inside <main>, which per the HTML-to-ARIA mapping means it
    // is NOT a contentinfo landmark -- so zero contentinfo here does not
    // mean zero footers.)
    await expect(page.getByRole("link", { name: "Cookies" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    // The landing's own footer is still there, and is the only one.
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.getByText("Made for gamers, by gamers")).toBeVisible();
  });

  test("is shown on the logged-in home feed, which has no footer of its own", async ({ page }) => {
    await login(page, memberEmail);
    await page.goto("/");

    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Cookies" })).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: "Pages", exact: true }).click();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });
});
