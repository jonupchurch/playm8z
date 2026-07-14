import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Fixes a real bug (found 2026-07-14): @auth/core's OAuth callback
 * handler unconditionally forces `emailVerified: null` when creating a
 * brand-new user for a first-time OAuth sign-up, overriding whatever
 * src/auth.ts's Google `profile()` mapping computed from Google's own
 * `email_verified` claim -- every Google sign-up was silently stuck
 * permanently "unverified" with no way to ever pass verification (the
 * verification email is Credentials-only and console-logged, not
 * actually sent). Called from src/auth.ts's signIn callback on every
 * sign-in (not just creation), so it also retroactively fixes any
 * account already stuck this way -- extracted here so the logic is
 * testable without exercising NextAuth's own machinery.
 */
export async function verifyGoogleEmail(userId: string): Promise<void> {
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, userId));
}
