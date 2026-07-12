import { test, expect } from "@playwright/test";

// Placeholder smoke test -- stands in for Principle V's required
// full-vertical-slice e2e test until a real feature (spec'd/planned/
// tasked per the constitution's project-wide gate) exists to test.
test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
});
