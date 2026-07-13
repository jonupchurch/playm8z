import { defineConfig, devices } from "@playwright/test";

// Playwright doesn't load .env.local automatically (only Next.js's dev
// server does) -- load it explicitly so specs that talk to the database
// directly (setup/cleanup) see DATABASE_URL, matching vitest.config.ts's
// same pattern.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Missing .env.local is fine in CI, where env vars are already set.
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
