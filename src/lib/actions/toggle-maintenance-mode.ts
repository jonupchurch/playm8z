"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { toggleMaintenanceModeSchema, type ToggleMaintenanceModeInput } from "@/lib/validations/admin-settings";

export type ToggleMaintenanceModeResult = { success: true } | { success: false; error: string };

// FR-003: real effect via Error Pages' (002) existing
// `settings.maintenanceMode`/`maintenanceMessage` fields and
// proxy.ts's enforcement path -- the single most anticipated control
// this feature ships (002's own data-model.md always deferred this).
export async function toggleMaintenanceMode(input: ToggleMaintenanceModeInput): Promise<ToggleMaintenanceModeResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = toggleMaintenanceModeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings({
    maintenanceMode: parsed.data.maintenanceMode,
    maintenanceMessage: parsed.data.maintenanceMessage?.trim() || null,
  });

  await logAuditEntry({
    actorId: admin.id,
    action: parsed.data.maintenanceMode ? "enabled maintenance mode" : "disabled maintenance mode",
    category: "system",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
