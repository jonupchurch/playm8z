"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { saveGeneralSettingsSchema, type SaveGeneralSettingsInput } from "@/lib/validations/admin-settings";

export type SaveGeneralSettingsResult = { success: true } | { success: false; error: string };

// FR-001/FR-002/FR-012: gated at admin (stricter than every other
// admin page's moderator minimum). No current reader for these fields
// (nav/footer/theming remain Design System infra, spec.md's own
// Assumptions) -- this still persists them for real.
export async function saveGeneralSettings(input: SaveGeneralSettingsInput): Promise<SaveGeneralSettingsResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = saveGeneralSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings({
    siteName: parsed.data.siteName,
    tagline: parsed.data.tagline?.trim() || null,
    supportEmail: parsed.data.supportEmail?.trim() || null,
    defaultTheme: parsed.data.defaultTheme,
  });

  await logAuditEntry({
    actorId: admin.id,
    action: "updated general settings",
    category: "system",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
