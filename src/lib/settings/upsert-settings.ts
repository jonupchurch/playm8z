import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";

type SettingsPatch = Partial<typeof settings.$inferInsert>;

// Singleton row -- `drizzle-kit push` never runs a migration file's own
// seed INSERTs (e2e/maintenance.spec.ts first found this), so the one-
// and-only `settings` row may not exist yet in a fresh database. Every
// settings-save Server Action (any section) shares this so none of
// them accidentally create a second row.
//
// Also invalidates get-settings.ts's own 5s TTL cache -- `revalidatePath()`
// (called separately by each Server Action) only invalidates Next.js's
// route cache, not this hand-rolled one; without this, an admin saving
// and immediately reloading would see stale data for up to 5s (a real
// bug an admin-settings.spec.ts e2e test caught).
export async function upsertSettings(patch: SettingsPatch): Promise<void> {
  const [row] = await db.select({ id: settings.id }).from(settings).limit(1);
  if (row) {
    await db.update(settings).set(patch).where(eq(settings.id, row.id));
  } else {
    await db.insert(settings).values(patch);
  }
  invalidateSettingsCache();
}
