import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Owner marker check (041, ADR 0014). The owner is a single account carrying
// `user.isOwner` -- a flag ORTHOGONAL to `role` (the owner keeps role='admin'),
// so this never touches the role hierarchy. Reads the flag fresh from the DB by
// session email every call (same idiom as require-role.ts's lookupRole), so
// provisioning takes effect on the next request without threading anything
// through the JWT. Server-only (imports `@/db`) -- never import into a client
// component.
export async function isCurrentUserOwner(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  const [row] = await db.select({ isOwner: users.isOwner }).from(users).where(eq(users.email, session.user.email));
  return row?.isOwner ?? false;
}
