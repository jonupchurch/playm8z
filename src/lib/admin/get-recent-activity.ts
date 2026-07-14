import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";

export type RecentActivityItem = {
  id: string;
  actorHandle: string | null;
  action: string;
  targetLabel: string | null;
  category: string;
  createdAt: Date;
};

const RECENT_ACTIVITY_LIMIT = 8;

// FR-006/SC-005: most-recent-first; an empty array renders the empty
// state (recent-activity.tsx) instead of a broken/blank section.
export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  return db
    .select({
      id: auditEntries.id,
      actorHandle: users.handle,
      action: auditEntries.action,
      targetLabel: auditEntries.targetLabel,
      category: auditEntries.category,
      createdAt: auditEntries.createdAt,
    })
    .from(auditEntries)
    .leftJoin(users, eq(auditEntries.actorId, users.id))
    .orderBy(desc(auditEntries.createdAt))
    .limit(RECENT_ACTIVITY_LIMIT);
}
