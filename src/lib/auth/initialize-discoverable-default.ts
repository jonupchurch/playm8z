import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSettings } from "@/lib/settings/get-settings";

/**
 * Admin Settings (024)/FR-011: initializes a brand-new user's own
 * `privacyDiscoverable` (007) from the platform's current
 * `discoverableByDefault` setting, rather than the column's own
 * hardcoded default. Called from src/auth.ts's `events.createUser` --
 * the only point @auth/drizzle-adapter creates a `user` row itself
 * (Google OAuth's own sign-up path; the Credentials sign-up path
 * inserts directly in register/route.ts, which sets this at insert
 * time instead). Extracted here so the logic is testable without
 * exercising NextAuth's own machinery, same pattern as
 * reactivate-on-sign-in.ts.
 */
export async function initializeDiscoverableDefault(userId: string): Promise<void> {
  const settings = await getSettings();
  await db.update(users).set({ privacyDiscoverable: settings.discoverableByDefault }).where(eq(users.id, userId));
}
