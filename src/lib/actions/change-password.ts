"use server";

import { compare, hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { changePasswordSchema } from "@/lib/validations/profile";

export type ChangePasswordResult = { success: true } | { success: false; error: string };

// FR-004/FR-005: only offered to accounts with a set password
// (Credentials); re-verifies the current password against the stored
// hash server-side (research.md #2) rather than trusting the form
// only reached submission because the user typed the right value.
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const authUser = await requireAuth();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!user?.passwordHash) {
    return { success: false, error: "This account doesn't have a password set." };
  }

  const currentMatches = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return { success: false, error: "Current password is incorrect." };
  }

  const newHash = await hash(parsed.data.newPassword, 10);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, authUser.id));

  return { success: true };
}
