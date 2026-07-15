"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { saveFeatureFlagsSchema, type SaveFeatureFlagsInput } from "@/lib/validations/admin-settings";

export type SaveFeatureFlagsResult = { success: true } | { success: false; error: string };

// FR-009/FR-010/research.md #8: only `openSignups` gets real
// enforcement (Auth & Onboarding's, 001, sign-up path); the other five
// flags persist but are consulted by nothing yet (docs/future-work.md).
export async function saveFeatureFlags(input: SaveFeatureFlagsInput): Promise<SaveFeatureFlagsResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = saveFeatureFlagsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings(parsed.data);

  await logAuditEntry({
    actorId: admin.id,
    action: "updated feature flags",
    category: "system",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
