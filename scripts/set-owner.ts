// Provisions the single site owner (041, ADR 0014): sets `user.isOwner = true`
// for OWNER_EMAIL. Idempotent — safe to re-run against local and prod.
//
// Usage:
//   npx tsx scripts/set-owner.ts                 # OWNER_EMAIL defaults below
//   OWNER_EMAIL=you@example.com DATABASE_URL=<url> npx tsx scripts/set-owner.ts
//
// The owner marker is deliberately not settable through any UI, so this script
// is how it is granted.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fine if DATABASE_URL is provided another way
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const ownerEmail = process.env.OWNER_EMAIL ?? "jonupchurch@gmail.com";

  const { db } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const updated = await db
    .update(users)
    .set({ isOwner: true })
    .where(eq(users.email, ownerEmail))
    .returning({ id: users.id, email: users.email, isOwner: users.isOwner, role: users.role });

  if (updated.length === 0) {
    throw new Error(`No account found for ${ownerEmail} — cannot set owner.`);
  }
  console.log(`Owner set: ${updated[0].email} (isOwner=${updated[0].isOwner}, role=${updated[0].role})`);
  process.exit(0);
}

main();

export {};
