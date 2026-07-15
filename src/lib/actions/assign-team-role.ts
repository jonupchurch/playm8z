"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { assignTeamRoleSchema, type AssignTeamRoleInput } from "@/lib/validations/admin-settings";

export type AssignTeamRoleResult = { success: true } | { success: false; error: string };

// FR-007/FR-008/research.md #6: "Invite a team member" assigns an
// EXISTING account's role directly -- no invite-token/pending-invite
// entity. An email matching no account gets a clear message rather
// than silently doing nothing or creating a phantom invite. Also the
// same action a team-list row's own role dropdown calls (both are
// "set this user's role", just reached via email lookup vs. a known
// userId -- deliberately one action, not two).
export async function assignTeamRole(input: AssignTeamRoleInput): Promise<AssignTeamRoleResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = assignTeamRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [user] = await db.select({ id: users.id, handle: users.handle }).from(users).where(eq(users.email, parsed.data.email));
  if (!user) {
    return { success: false, error: "No account found for that email -- they need to sign up first." };
  }

  await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, user.id));

  await logAuditEntry({
    actorId: admin.id,
    action: `set role to ${parsed.data.role}`,
    category: "access",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.handle ?? undefined,
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
