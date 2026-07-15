"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { saveSafetySettingsSchema, type SaveSafetySettingsInput } from "@/lib/validations/admin-settings";

export type SaveSafetySettingsResult = { success: true } | { success: false; error: string };

// FR-011: initializes a brand-new user's own `privacyDiscoverable`
// (007) at account creation (001) -- has no further effect until a
// future discovery/search feature consults `privacyDiscoverable`
// itself (spec.md's own Assumptions).
export async function saveSafetySettings(input: SaveSafetySettingsInput): Promise<SaveSafetySettingsResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = saveSafetySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings(parsed.data);

  await logAuditEntry({
    actorId: admin.id,
    action: "updated safety settings",
    category: "system",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
