import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone CLI, outside Next.js's automatic
// .env.local loading -- load it explicitly before reading DATABASE_URL.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local missing is fine in CI/hosted environments where
  // DATABASE_URL is already set in the real environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (checked .env.local and the environment).");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
