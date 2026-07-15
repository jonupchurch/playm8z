"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { saveModerationSettingsSchema, type SaveModerationSettingsInput } from "@/lib/validations/admin-settings";

export type SaveModerationSettingsResult = { success: true } | { success: false; error: string };

// FR-004/FR-005/FR-006: real effect on the shared auto-flag-rules.ts
// helper (017/018), the computed auto-hide rule (003/004/009), and the
// display-only "needs ban review" badge (017/018/019) -- all read
// settings fresh on every call, so nothing here needs to touch any of
// those files directly.
export async function saveModerationSettings(input: SaveModerationSettingsInput): Promise<SaveModerationSettingsResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = saveModerationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings(parsed.data);

  await logAuditEntry({
    actorId: admin.id,
    action: "updated moderation & auto-flag settings",
    category: "moderation",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
