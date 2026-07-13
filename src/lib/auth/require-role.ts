import { forbidden, unauthorized } from "next/navigation";
import { auth } from "@/auth";

// Matches the 5-tier model Admin Settings (024) will add to `users.role`
// (its data-model.md): user < support/viewer < moderator < admin. No
// `role` column exists yet, so every authenticated user is honestly
// rank 'user' for now -- nothing elevated exists yet, so any minimum
// above 'user' correctly forbids everyone until that column ships.
// Update the rank lookup to read the real column once it does.
const ROLE_RANK = { user: 0, support: 1, viewer: 1, moderator: 2, admin: 3 } as const;
export type Role = keyof typeof ROLE_RANK;

/**
 * Reusable gate for role/auth-restricted pages (FR-006/FR-007/FR-008) --
 * calls unauthorized() (401) when there's no session, forbidden() (403)
 * when the session's role is below the given minimum, and returns
 * normally otherwise. Ready for future gated pages (most notably
 * `/admin/*`) to call; no real caller exists yet in this codebase.
 */
export async function requireRole(minimum: Role): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    unauthorized();
    return;
  }

  const currentRank = ROLE_RANK.user;
  if (currentRank < ROLE_RANK[minimum]) {
    forbidden();
    return;
  }
}
