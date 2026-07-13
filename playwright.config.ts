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
  // Single worker: some specs (e.g. maintenance.spec.ts) mutate shared,
  // global app state (the one-row settings table) for real -- running
  // spec files concurrently would let that bleed into unrelated tests
  // hitting the same routes mid-run. Correctness over parallel speed at
  // this suite's current size.
  fullyParallel: false,
  workers: 1,
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
