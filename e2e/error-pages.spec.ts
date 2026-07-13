import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("404 — not found (quickstart.md Scenario 1)", () => {
  test("renders the branded not-found page with a real 404 status and working links", async ({
    page,
  }) => {
    const response = await page.goto("/this-route-does-not-exist-xyz");
    expect(response?.status()).toBe(404);

    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This lobby is empty" })).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    await expect(page.getByRole("link", { name: "Browse games" })).toHaveAttribute(
      "href",
      "/browse",
    );
    await page.getByRole("link", { name: "Back to home" }).click();
    await page.waitForURL("http://localhost:3000/");
  });
});

test.describe("500 — server error (quickstart.md Scenario 2)", () => {
  test("renders the branded server-error page with a real 500 status and a reference code", async ({
    page,
  }) => {
    const response = await page.goto("/test-error-boundary");
    expect(response?.status()).toBe(500);

    await expect(page.getByRole("heading", { name: "Something broke on our end" })).toBeVisible();
    await expect(page.getByText(/Error ref:/)).toBeVisible();

    const a11yScan = await new AxeBuilder({ page }).analyze();
    expect(a11yScan.violations).toEqual([]);

    // The underlying route always throws, so retrying re-shows the same
    // branded page rather than doing nothing or navigating away.
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Something broke on our end" })).toBeVisible();
  });
});
