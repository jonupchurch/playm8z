"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { upsertSettings } from "@/lib/settings/upsert-settings";
import { saveListsSettingsSchema, type SaveListsSettingsInput } from "@/lib/validations/admin-settings";

export type SaveListsSettingsResult = { success: true } | { success: false; error: string };

// FR-004/FR-005: real effect on Post a Game, Browse, and the landing
// page's genre counts -- all read the list fresh per request, so
// nothing here touches those files.
//
// Goes through upsertSettings() rather than writing the table directly,
// because that is what calls invalidateSettingsCache(). revalidatePath()
// below only clears Next.js's route cache, NOT get-settings.ts's own 5s
// TTL cache -- they're two separate layers, and a direct write would
// leave an admin's own save invisible to them for up to 5 seconds.
export async function saveListsSettings(input: SaveListsSettingsInput): Promise<SaveListsSettingsResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsed = saveListsSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertSettings(parsed.data);

  await logAuditEntry({
    actorId: admin.id,
    action: "updated the genre list",
    category: "content",
  });

  revalidatePath("/admin/settings", "layout");
  return { success: true };
}
