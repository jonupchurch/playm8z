import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcrypt-ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";

const runId = crypto.randomUUID().slice(0, 8);
const password = "correcthorse";
const authedEmail = `e2e-landing-authed-${runId}@example.com`;
const hostEmail = `e2e-landing-host-${runId}@example.com`;
const applicantEmail = `e2e-landing-applicant-${runId}@example.com`;

let hostId: string;
let applicantId: string;
const postingIds: string[] = [];
const applicationIds: string[] = [];
const userEmails = [authedEmail, hostEmail, applicantEmail];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("http://localhost:3000/");
}

function parseCount(text: string | null): number {
  return Number((text ?? "0").replace(/[^\d]/g, ""));
}

test.beforeAll(async () => {
  const passwordHash = await hash(password, 10);
  await db.insert(users).values([
    { email: authedEmail, passwordHash, handle: `e2elandauth${runId}`, emailVerified: new Date() },
    { email: hostEmail, passwordHash, handle: `e2elandhost${runId}`, emailVerified: new Date() },
    { email: applicantEmail, passwordHash, handle: `e2elandappl${runId}`, emailVerified: new Date() },
  ]);
  const [host] = await db.select({ id: users.id }).from(users).where(eq(users.email, hostEmail));
  hostId = host.id;
  const [applicant] = await db.select({ id: users.id }).from(users).where(eq(users.email, applicantEmail));
  applicantId = applicant.id;

  // Both rows get an EXPLICIT createdAt (never mixing one explicit
  // value with the schema's own server-side defaultNow() on the
  // other) -- postgres.js converts a JS Date for a "timestamp without
  // time zone" column using a different reference than Postgres's own
  // now()/defaultNow(), so comparing one against the other can produce
  // a several-hour skew. Setting both explicitly, from the same JS
  // clock, keeps their relative order correct and comparable.
  const now = new Date();
  const [posting1] = await db
    .insert(postings)
    .values({
      hostId,
      game: `E2E Landing FPS ${runId}`,
      title: `Landing hero test ${runId}`,
      blurb: "blurb",
      vibe: "casual",
      region: "na-west",
      genre: "FPS",
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      createdAt: now,
    })
    .returning({ id: postings.id });
  postingIds.push(posting1.id);

  const [posting2] = await db
    .insert(postings)
    .values({
      hostId,
      game: `E2E Landing TTRPG ${runId}`,
      title: `Landing secondary test ${runId}`,
      blurb: "blurb",
      vibe: "casual",
      region: "eu-west",
      genre: "TTRPG",
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "table",
      createdAt: new Date(now.getTime() - 60_000),
    })
    .returning({ id: postings.id });
  postingIds.push(posting2.id);

  const [pendingApplication] = await db
    .insert(applications)
    .values({ postingId: posting1.id, applicantId, message: "let me in", status: "pending" })
    .returning({ id: applications.id });
  applicationIds.push(pendingApplication.id);
});

test.afterAll(async () => {
  await db.delete(applications).where(inArray(applications.id, applicationIds));
  await db.delete(postings).where(inArray(postings.id, postingIds));
  for (const email of userEmails) await db.delete(users).where(eq(users.email, email));
});

test.describe("User Story 1 - unauthenticated root route (Scenarios 1-3, 5-7)", () => {
  test("shows this feature's real marketing content, not a redirect and not Home, axe clean", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Find your people\./ })).toBeVisible();
    // Substring collision: the footer's OWN tagline copy ("Find people
    // to play anything with.") legitimately contains this phrase --
    // scope the negative check to Home's specific H1, not any text.
    await expect(page.getByRole("heading", { name: "Find people to play", exact: false })).not.toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);
  });

  test("an authenticated visitor still sees Home exactly as before, unaffected", async ({ page }) => {
    await login(page, authedEmail);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Find people to play", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Find your people\./ })).not.toBeVisible();
  });

  test("no fabricated online-presence count or average-rating number appears anywhere (FR-003)", async ({ page }) => {
    await page.goto("/");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/online now/i);
    expect(bodyText).not.toMatch(/avg\.? (teammate )?rating/i);
    expect(bodyText).not.toMatch(/★.*rating/i);
  });

  test("the hero shows a real, currently-open posting -- never fabricated example content (US3)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(`E2E Landing FPS ${runId}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: `Landing hero test ${runId}` })).toBeVisible();
    await expect(page.getByText(`E2E Landing TTRPG ${runId}`)).toBeVisible();
  });

  test("Browse by genre shows all 8 real genres with real counts (FR-006)", async ({ page }) => {
    await page.goto("/");
    for (const genre of ["FPS", "RPG", "Co-op PvE", "Party", "MOBA", "Sandbox", "TTRPG", "Tabletop"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${genre}`) })).toBeVisible();
    }
  });

  test("the features grid describes only real capabilities -- reworded profile copy, no reliability claim, Discord keeps SOON (FR-007)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Real player profiles" })).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/reliability/i);
    // {exact:true} -- non-exact substring matching would also hit
    // "Groups (soon)" and the footer's "...coming soon" text.
    await expect(page.getByText("SOON", { exact: true })).toBeVisible();
  });

  test("trust-bar and hero stats are real and delta-accurate against freshly-seeded data", async ({ page }) => {
    await page.goto("/");
    // {exact:true} -- "players" as a non-exact substring also matches
    // the hero paragraph, the how-it-works copy, and the testimonials
    // heading; only the trust-bar's own label is the bare word alone.
    const beforePlayers = parseCount(await page.getByText("players", { exact: true }).locator("..").locator("div").first().innerText());
    const beforeParties = parseCount(
      await page.getByText("parties formed this week", { exact: true }).locator("..").locator("div").first().innerText(),
    );

    const deltaEmail = `e2e-landing-delta-${runId}@example.com`;
    const passwordHash = await hash(password, 10);
    const [deltaUser] = await db
      .insert(users)
      .values({ email: deltaEmail, passwordHash, handle: `e2elanddelta${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    const [acceptedApplication] = await db
      .insert(applications)
      .values({ postingId: postingIds[0], applicantId: deltaUser.id, status: "accepted", acceptedAt: new Date() })
      .returning({ id: applications.id });
    applicationIds.push(acceptedApplication.id);

    try {
      // A same-context reload of the identical "/" URL can be served
      // from Chromium's own HTTP cache under next dev (weak dev-mode
      // cache headers, no Vary: Cookie) -- a confirmed, previously-hit
      // class of false staleness in this project, not a real bug.
      // toPass() retries the navigate-and-check until the real,
      // freshly-rendered numbers show up.
      await expect(async () => {
        await page.goto("/");
        const afterPlayers = parseCount(
          await page.getByText("players", { exact: true }).locator("..").locator("div").first().innerText(),
        );
        const afterParties = parseCount(
          await page.getByText("parties formed this week", { exact: true }).locator("..").locator("div").first().innerText(),
        );
        expect(afterPlayers - beforePlayers).toBe(1);
        expect(afterParties - beforeParties).toBe(1);
      }).toPass({ timeout: 10_000 });
    } finally {
      await db.delete(users).where(eq(users.email, deltaEmail));
    }
  });
});

test.describe("User Story 2 - CTAs navigate correctly (Scenario 8)", () => {
  test("hero 'Get started' reaches sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Get started/ }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("hero 'Browse games' reaches Browse", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Browse games" }).click();
    await expect(page).toHaveURL(/\/browse/);
  });

  test("the final CTA's 'Sign up free' reaches sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign up free" }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("the nav's 'Log in' reaches the login route (nav itself is Design System infra, out of this feature's scope)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Footer links (FR-010, Scenario 9)", () => {
  test("About/Privacy/Terms link to the three real seeded system pages", async ({ page }) => {
    await page.goto("/");
    // Scoped to this footer: the site nav now carries an "About" link of
    // its own, so an unscoped exact-name lookup matches two elements and
    // trips strict mode. The sitewide footer stands down on the
    // logged-out landing, so this is the page's only <footer>.
    const footer = page.locator("footer");
    await expect(footer).toHaveCount(1);
    for (const [label, path] of [
      ["About", "/pages/about"],
      ["Privacy", "/pages/privacy"],
      ["Terms", "/pages/terms"],
    ] as const) {
      const href = await footer.getByRole("link", { name: label, exact: true }).getAttribute("href");
      expect(href).toBe(path);
    }
  });

  test("Careers/Safety Center are not seeded by this feature -- not-found until an admin creates them", async ({ page }) => {
    // Community Guidelines is deliberately excluded here: this shared
    // dev DB already has an unrelated leftover "community-guidelines"
    // content page from other testing, and FR-010 only requires that
    // an as-yet-uncreated slug 404s, not that these three slugs stay
    // permanently absent -- Careers/Safety Center are confirmed absent
    // in this environment and are enough to prove the real behavior.
    await page.goto("/");
    for (const path of ["/pages/careers", "/pages/safety-center"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    }
  });
});

test.describe("User Story 3 - acceptedAt backs 'parties formed this week' (Scenario 10)", () => {
  test("accepting a pending application via Inbox sets acceptedAt, reflected here on next load", async ({ page }) => {
    await page.goto("/");
    const before = parseCount(
      await page.getByText("parties formed this week", { exact: true }).locator("..").locator("div").first().innerText(),
    );

    await login(page, hostEmail);
    await page.goto(`/inbox/${applicationIds[0]}`);
    await page.getByRole("button", { name: "Accept" }).click();
    await page.waitForURL((url) => !url.pathname.includes(applicationIds[0]), { timeout: 5000 });

    const [application] = await db.select({ acceptedAt: applications.acceptedAt }).from(applications).where(eq(applications.id, applicationIds[0]));
    expect(application.acceptedAt).not.toBeNull();

    await page.context().clearCookies();
    await page.goto("/");
    const after = parseCount(
      await page.getByText("parties formed this week", { exact: true }).locator("..").locator("div").first().innerText(),
    );
    expect(after - before).toBe(1);
  });
});
