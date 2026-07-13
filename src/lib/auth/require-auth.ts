import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Server-side gate for write actions that only need an authenticated
 * session, not Auth & Onboarding's stricter unverified-email gate
 * (require-verified-email.ts). Editing one's own account -- profile,
 * games, password, email, own postings, privacy, deactivation -- isn't
 * the kind of public-facing write action (posting/applying/messaging)
 * that gate exists to protect against.
 */
export async function requireAuth(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated.");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) {
    throw new Error("Not authenticated.");
  }

  return user;
}
