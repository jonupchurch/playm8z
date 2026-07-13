import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

// The running dev server's get-settings.ts cache has a ~5s TTL
// (research.md #2) -- these waits reflect that real, accepted staleness
// rather than working around it.
const CACHE_TTL_WAIT_MS = 5500;

async function setMaintenance(mode: boolean, message: string | null) {
  const [row] = await db.select().from(settings).limit(1);
  await db
    .update(settings)
    .set({ maintenanceMode: mode, maintenanceMessage: message })
    .where(eq(settings.id, row.id));
}

test.describe("Maintenance mode (quickstart.md Scenario 4)", () => {
  test.afterAll(async () => {
    await setMaintenance(false, null);
  });

  test("shows the maintenance page (503) for non-admin routes, exempts /admin/*, and honors a configured message", async ({
    page,
  }) => {
    await setMaintenance(true, null);
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);

    const homeResponse = await page.goto("/");
    expect(homeResponse?.status()).toBe(503);
    await expect(page.getByRole("heading", { name: "We're re-rolling the servers" })).toBeVisible();
    await expect(
      page.getByText("playm8z is briefly offline for scheduled upgrades."),
    ).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    // /admin/* is never intercepted by the maintenance check -- since no
    // real admin page exists yet, this genuinely 404s rather than
    // showing the maintenance page, which is exactly what proves the
    // exemption works.
    const adminResponse = await page.goto("/admin/anything");
    expect(adminResponse?.status()).toBe(404);

    await setMaintenance(true, "Back online by 03:00 UTC.");
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);
    await page.goto("/");
    await expect(page.getByText("Back online by 03:00 UTC.")).toBeVisible();

    await setMaintenance(false, null);
    await page.waitForTimeout(CACHE_TTL_WAIT_MS);
    const restoredResponse = await page.goto("/");
    expect(restoredResponse?.status()).not.toBe(503);
  });
});
