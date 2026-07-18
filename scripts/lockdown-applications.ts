// One-time, idempotent lockdown migration for feature 046 (ADR 0018). Order is
// load-bearing:
//   1. collapse duplicate ACTIVE applications (the partial unique index fails while they exist)
//   2. create the partial unique index on (postingId, applicantId) WHERE status IN ('pending','accepted')
// Safe to run repeatedly and against any environment. Run local first, then prod
// (pass the prod DATABASE_URL in the environment):
//   npx tsx scripts/lockdown-applications.ts
//   DATABASE_URL=<prod-url> npx tsx scripts/lockdown-applications.ts
import { sql } from "drizzle-orm";

async function main() {
  // Local: pull DATABASE_URL from .env.local. Prod: DATABASE_URL is passed in the
  // environment -- never let .env.local clobber it (guarded).
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      /* already set in the environment (CI/prod) */
    }
  }

  const { db } = await import("../src/db");
  const { dedupeActiveApplications } = await import("../src/lib/applications/dedupe-active-applications");

  const dedupe = await dedupeActiveApplications();
  console.log(`dedupe: ${dedupe.groups} duplicate active group(s) collapsed, ${dedupe.deleted} row(s) removed`);

  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "applications_active_uniq" ON "applications" ("postingId", "applicantId") WHERE status IN ('pending','accepted')`,
  );
  console.log('index: "applications_active_uniq" ensured');

  const idx = await db.execute(
    sql`SELECT indexname FROM pg_indexes WHERE tablename = 'applications' AND indexname = 'applications_active_uniq'`,
  );
  const present = idx.length === 1;
  console.log(`verify: partial unique index present = ${present}`);
  if (!present) {
    throw new Error("Lockdown verification failed -- index missing");
  }
  console.log("lockdown-applications: complete");
  await process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
