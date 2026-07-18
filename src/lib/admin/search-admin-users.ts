import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, postings, reports, users } from "@/db/schema";
import type { AdminUsersFilters } from "@/lib/validations/admin-users";

export type AdminUserStatus = "active" | "flagged" | "banned";

export type AdminUserRow = {
  id: string;
  handle: string;
  email: string;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
  region: string | null;
  createdAt: Date;
  postingCount: number;
  forumThreadCount: number;
  openReportCount: number;
  status: AdminUserStatus;
};

export type AdminUsersStats = { total: number; active: number; flagged: number; banned: number };
export type AdminUsersResult = { stats: AdminUsersStats; rows: AdminUserRow[] };

const reportCounts = db
  .select({ userId: reports.targetId, reportCount: sql<number>`count(*)::int`.as("reportCount") })
  .from(reports)
  .where(and(eq(reports.targetType, "user"), eq(reports.status, "open")))
  .groupBy(reports.targetId)
  .as("reportCounts");

const postingCounts = db
  .select({ userId: postings.hostId, postingCount: sql<number>`count(*)::int`.as("postingCount") })
  .from(postings)
  .groupBy(postings.hostId)
  .as("postingCounts");

const threadCounts = db
  .select({ userId: forumThreads.authorId, threadCount: sql<number>`count(*)::int`.as("threadCount") })
  .from(forumThreads)
  .groupBy(forumThreads.authorId)
  .as("threadCounts");

// research.md #3: "flagged" is computed here (never a stored column) --
// an unbanned user with at least one currently-open `reports` row
// (targetType='user'). Computed once as a SQL CASE expression so both
// the row list and the stats below stay in lockstep by construction.
const statused = db
  .select({
    id: users.id,
    handle: users.handle,
    email: users.email,
    avatarColor: users.avatarColor,
    avatarImage: users.avatarImage,
    image: users.image,
    region: users.region,
    createdAt: users.createdAt,
    openReportCount: sql<number>`coalesce(${reportCounts.reportCount}, 0)::int`.as("openReportCount"),
    postingCount: sql<number>`coalesce(${postingCounts.postingCount}, 0)::int`.as("postingCount"),
    forumThreadCount: sql<number>`coalesce(${threadCounts.threadCount}, 0)::int`.as("forumThreadCount"),
    status: sql<AdminUserStatus>`
      case
        when ${users.bannedAt} is not null then 'banned'
        when coalesce(${reportCounts.reportCount}, 0) > 0 then 'flagged'
        else 'active'
      end
    `.as("status"),
  })
  .from(users)
  .leftJoin(reportCounts, eq(reportCounts.userId, users.id))
  .leftJoin(postingCounts, eq(postingCounts.userId, users.id))
  .leftJoin(threadCounts, eq(threadCounts.userId, users.id))
  .as("statused");

// FR-002/FR-003/FR-004: stats always reflect ALL users (unaffected by
// the current search/filter, same "independent of the current view"
// precedent as Forum index's own getCategoryCounts()); the row list is
// the real, server-side-filtered/searched query research.md #4 calls
// for (Browse's/Forum index's own architecture), not a fetch-all-then-
// filter-in-JS shortcut.
export async function searchAdminUsers(filters: AdminUsersFilters): Promise<AdminUsersResult> {
  const [statsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${statused.status} = 'active')::int`,
      flagged: sql<number>`count(*) filter (where ${statused.status} = 'flagged')::int`,
      banned: sql<number>`count(*) filter (where ${statused.status} = 'banned')::int`,
    })
    .from(statused);

  const conditions: SQL[] = [];
  if (filters.status !== "all") conditions.push(eq(statused.status, filters.status));
  const q = filters.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const keywordMatch = or(ilike(statused.handle, pattern), ilike(statused.email, pattern));
    if (keywordMatch) conditions.push(keywordMatch);
  }

  const rows = await db
    .select()
    .from(statused)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(statused.createdAt));

  return {
    stats: statsRow,
    rows: rows.map((row) => ({ ...row, handle: row.handle ?? FALLBACK_HANDLE })),
  };
}
