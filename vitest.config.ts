import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest doesn't load .env.local automatically (that's a Next.js
// runtime behavior, not a Vite/Vitest one) -- load it explicitly so
// modules that read process.env during tests see it.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Missing .env.local is fine in CI, where env vars are already set.
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    // Several integration test files mutate shared, global Postgres
    // state for real (e.g. get-trending.test.ts/get-facet-counts.test.ts
    // both do an unscoped `db.delete(postings)` in their own beforeAll,
    // since they aggregate over the whole table) -- Vitest's default
    // file-level parallelism let that race with other files' own rows
    // (search-postings.test.ts inserts but never clears), an
    // intermittent failure discovered while testing an unrelated
    // feature. Same fix, same reasoning, as playwright.config.ts's
    // `workers: 1`/`fullyParallel: false`: correctness over parallel
    // speed at this suite's current size. `fileParallelism: false` alone
    // (on the default "threads" pool) broke Vitest's own runner context
    // in this version -- pairing it with a single forked process fixes
    // that while still fully serializing file execution.
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
  },
});
