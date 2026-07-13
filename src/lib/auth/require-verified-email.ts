import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export class UnverifiedEmailError extends Error {
  constructor() {
    super(
      "Verify your email before posting, applying, or messaging. Check your inbox for the verification link.",
    );
    this.name = "UnverifiedEmailError";
  }
}

/**
 * Server-side gate for write actions (FR-014) -- posting, applying,
 * messaging, and any future write action gets this same check. Reads the
 * session's user record directly (research.md #3) rather than as
 * middleware, since reads must never be blocked, only writes.
 *
 * No caller exists yet in this codebase -- future write-action features
 * call this first, before their own Zod validation.
 */
export async function requireVerifiedEmail(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated.");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) {
    throw new Error("Not authenticated.");
  }

  if (!user.emailVerified) {
    throw new UnverifiedEmailError();
  }

  return { id: user.id, email: user.email };
}
