import { forbidden, unauthorized } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// The 5-tier model Admin Settings (024) added to `users.role`: user <
// support/viewer < moderator < admin. `support`/`viewer` are both
// below `moderator` for every existing gate -- no feature
// differentiates them further yet (research.md #5).
export const ROLE_RANK = { user: 0, support: 1, viewer: 1, moderator: 2, admin: 3 } as const;
export type Role = keyof typeof ROLE_RANK;

async function lookupRole(email: string): Promise<Role> {
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.email, email));
  return (row?.role as Role) ?? "user";
}

// Reads the real `role` column fresh from the DB on every call (never
// the JWT) so a role change takes effect on the session's very next
// request (spec.md SC-004) -- the same "re-query by session email"
// idiom already established by requireAuth()/requireVerifiedEmail(),
// rather than threading role through the JWT/session callback.
// proxy.ts's own maintenance-mode admin bypass is this function's
// other caller, alongside requireRole() below.
export async function getCurrentRole(): Promise<Role | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return lookupRole(session.user.email);
}

/**
 * Reusable gate for role/auth-restricted pages (FR-006/FR-007/FR-008) --
 * calls unauthorized() (401) when there's no session, forbidden() (403)
 * when the session's role is below the given minimum, and returns
 * normally otherwise.
 */
export async function requireRole(minimum: Role): Promise<void> {
  const session = await auth();
  if (!session?.user?.email) {
    unauthorized();
    return;
  }

  const role = await lookupRole(session.user.email);
  if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
    forbidden();
    return;
  }
}
