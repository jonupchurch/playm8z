import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { reports } from "@/db/schema";
import { getSettings } from "@/lib/settings/get-settings";

// Admin Settings (024)/research.md #2: computed live from the current
// open-report count, never a stored "hidden" flag -- resolving enough
// open reports (Approve/Remove/Dismiss, any of 017/018/019)
// automatically and correctly un-hides a row with zero extra code in
// any of those actions, since this is re-evaluated on every read.
// Returns null when auto-hide is disabled, so callers add nothing to
// their WHERE clause in the common case.
export async function getAutoHideCondition(targetType: "posting" | "forum", targetIdColumn: AnyPgColumn): Promise<SQL | null> {
  const settings = await getSettings();
  if (!settings.autoHideEnabled) return null;

  return sql`(
    select count(*)::int from ${reports}
    where ${reports.targetId} = ${targetIdColumn}
      and ${reports.targetType} = ${targetType}
      and ${reports.status} = 'open'
  ) < ${settings.autoHideThreshold}`;
}
