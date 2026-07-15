"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { removeTeamMemberSchema, type RemoveTeamMemberInput } from "@/lib/validations/admin-settings";

export type RemoveTeamMemberResult = { success: true } | { success: false; error: string };

// FR-007: reverts a team member's role back to the base `user` tier --
// never a ban, never account deletion (ADR 0005). This feature doesn't
// guard against removing the platform's last admin (spec.md's own
// Edge Cases) -- manual database recovery is the accepted path.
export async function removeTeamMember(input: RemoveTeamMemberInput): Promise<RemoveTeamMemberResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = removeTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [user] = await db.select({ id: users.id, handle: users.handle }).from(users).where(eq(users.id, parsed.data.userId));
  if (!user) {
    return { success: false, error: "User not found." };
  }

  await db.update(users).set({ role: "user" }).where(eq(users.id, user.id));

  await logAuditEntry({
    actorId: admin.id,
    action: "removed from team (reverted to base user role)",
    category: "access",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.handle ?? undefined,
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
