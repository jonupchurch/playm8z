import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Shared post-authentication landing point for login and Google sign-in
 * (FR-006/FR-007) -- signup routes straight to /onboarding instead (its
 * account always already has a handle from registration, which would
 * otherwise satisfy this same check and wrongly skip onboarding).
 *
 * The routing signal is simply "does this account have a handle yet."
 * Credentials accounts always do (set at registration), so returning
 * Credentials users always land on Home here regardless of how much of
 * onboarding they finished or skipped -- matching the spec's requirement
 * that onboarding is never re-prompted for them. Google accounts don't
 * get one until onboarding Step 1 sets it (research.md #2, deliberately
 * not auto-generated), so this is genuinely the one case this check
 * needs to resolve.
 */
export default async function ContinuePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [user] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user?.handle) {
    redirect("/onboarding");
  }

  redirect("/");
}
