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
  },
});
