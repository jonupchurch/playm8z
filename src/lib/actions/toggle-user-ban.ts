"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { toggleUserBanSchema, type ToggleUserBanInput } from "@/lib/validations/admin-users";

export type ToggleUserBanResult = { success: true; banned: boolean } | { success: false; error: string };

// FR-005/FR-006: the single severe account action this feature offers
// (no separate Delete, ADR 0005/research.md #1) -- a true toggle: bans
// an active/flagged user, unbans a banned one. Unbanning never clears
// any open reports against the user, so they correctly show as
// "flagged" afterward if still reported (research.md #3), not forced
// back to "active".
export async function toggleUserBan(input: ToggleUserBanInput): Promise<ToggleUserBanResult> {
  await requireRole("moderator");

  const parsed = toggleUserBanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [user] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, parsed.data.userId));
  if (!user) {
    return { success: false, error: "User not found." };
  }

  const nextBannedAt = user.bannedAt ? null : new Date();
  await db.update(users).set({ bannedAt: nextBannedAt }).where(eq(users.id, parsed.data.userId));

  revalidatePath("/admin/users", "layout");
  return { success: true, banned: nextBannedAt !== null };
}
