"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { updateProfileSchema } from "@/lib/validations/profile";

export type UpdateProfileResult = { success: true } | { success: false; error: string };

// FR-001: display name, region, bio. The handle is never accepted
// here -- it's always read-only (FR-002), immutable once set.
export async function updateProfile(input: {
  name: string;
  region: string;
  bio?: string;
}): Promise<UpdateProfileResult> {
  const user = await requireAuth();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(users)
    .set({ name: parsed.data.name, region: parsed.data.region, bio: parsed.data.bio ?? null })
    .where(eq(users.id, user.id));

  return { success: true };
}
