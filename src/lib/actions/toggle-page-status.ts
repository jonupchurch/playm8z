"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contentPages } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { togglePageStatusSchema, type TogglePageStatusInput } from "@/lib/validations/content-page";

export type TogglePageStatusResult = { success: true } | { success: false; error: string };

// FR-008: publish/draft transitions freely, any number of times
// (data-model.md's State notes) -- no history/audit trail beyond the
// single current `status` value.
export async function togglePageStatus(input: TogglePageStatusInput): Promise<TogglePageStatusResult> {
  await requireRole("moderator");

  const parsed = togglePageStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.update(contentPages).set({ status: parsed.data.status }).where(eq(contentPages.slug, parsed.data.slug));

  revalidatePath(`/pages/${parsed.data.slug}`);
  return { success: true };
}
