import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import type { SearchAuditLogInput } from "@/lib/validations/audit-log";
import { isSameDay, startOfToday } from "@/lib/dates";

export type AuditLogCategory = "moderation" | "content" | "access" | "system";

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorHandle: string;
  action: string;
  category: AuditLogCategory;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

export type AuditLogDayGroup = { label: "Today" | "Yesterday" | "Earlier"; entries: AuditLogEntry[] };

export type AuditLogActor = { id: string; handle: string };

export type AuditLogResult = { groups: AuditLogDayGroup[]; actors: AuditLogActor[]; hasMore: boolean };

const PAGE_SIZE = 20;

const SELECT_COLUMNS = {
  id: auditEntries.id,
  actorId: auditEntries.actorId,
  actorHandle: users.handle,
  action: auditEntries.action,
  category: auditEntries.category,
  targetType: auditEntries.targetType,
  targetId: auditEntries.targetId,
  targetLabel: auditEntries.targetLabel,
  reason: auditEntries.reason,
  meta: auditEntries.meta,
  createdAt: auditEntries.createdAt,
};

// FR-003: search (actor/action/target/reason) combined with the actor
// and category filters. Shared by getAuditLog and exportAuditLogCsv
// (research.md #5) so "what you see is what you export" holds exactly.
export function buildAuditLogConditions(filters: Pick<SearchAuditLogInput, "q" | "actor" | "category">): SQL[] {
  const conditions: SQL[] = [];

  if (filters.category !== "all") conditions.push(eq(auditEntries.category, filters.category));

  if (filters.actor === "system") conditions.push(isNull(auditEntries.actorId));
  else if (filters.actor !== "all") conditions.push(eq(auditEntries.actorId, filters.actor));

  const q = filters.q.trim();
  if (q) {
    const pattern = `%${q}%`;
    const keywordMatch = or(
      ilike(users.handle, pattern),
      ilike(auditEntries.action, pattern),
      ilike(auditEntries.targetLabel, pattern),
      ilike(auditEntries.reason, pattern),
    );
    if (keywordMatch) conditions.push(keywordMatch);
  }

  return conditions;
}

// research.md #4: Today/Yesterday/Earlier -- one bucket further back
// than Notifications' (012) own Today/Earlier, since this log is
// expected to be browsed further back. Pure/DB-free so it's directly
// unit-testable, same shape as filter-notifications.ts.
export function groupByDay(entries: AuditLogEntry[]): AuditLogDayGroup[] {
  const today = startOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayEntries: AuditLogEntry[] = [];
  const yesterdayEntries: AuditLogEntry[] = [];
  const earlierEntries: AuditLogEntry[] = [];

  for (const entry of entries) {
    if (isSameDay(entry.createdAt, today)) todayEntries.push(entry);
    else if (isSameDay(entry.createdAt, yesterday)) yesterdayEntries.push(entry);
    else earlierEntries.push(entry);
  }

  const groups: AuditLogDayGroup[] = [];
  if (todayEntries.length) groups.push({ label: "Today", entries: todayEntries });
  if (yesterdayEntries.length) groups.push({ label: "Yesterday", entries: yesterdayEntries });
  if (earlierEntries.length) groups.push({ label: "Earlier", entries: earlierEntries });
  return groups;
}

// Every distinct actor who has ever written an entry -- the wireframe's
// own "All actors"/named-actor/"System" select, populated from real
// data rather than a hardcoded demo list.
async function getAuditLogActors(): Promise<AuditLogActor[]> {
  const rows = await db
    .selectDistinct({ id: users.id, handle: users.handle })
    .from(auditEntries)
    .innerJoin(users, eq(auditEntries.actorId, users.id))
    .orderBy(asc(users.handle));
  return rows.map((row) => ({ id: row.id, handle: row.handle ?? FALLBACK_HANDLE }));
}

// FR-002/FR-003/research.md #6: a real, server-side searched/filtered/
// paginated query (Browse's/Forum index's/Admin Reports' precedent) --
// `auditEntries` accumulates indefinitely. Cumulative "Load more"
// (LIMIT page*PAGE_SIZE, News feed's/013's own pattern), fetching one
// extra row to cheaply derive `hasMore`.
export async function getAuditLog(filters: SearchAuditLogInput): Promise<AuditLogResult> {
  const conditions = buildAuditLogConditions(filters);
  const limit = filters.page * PAGE_SIZE;

  const [rows, actors] = await Promise.all([
    db
      .select(SELECT_COLUMNS)
      .from(auditEntries)
      .leftJoin(users, eq(auditEntries.actorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditEntries.createdAt))
      .limit(limit + 1),
    getAuditLogActors(),
  ]);

  const hasMore = rows.length > limit;
  const entries: AuditLogEntry[] = rows.slice(0, limit).map((row) => ({
    ...row,
    actorHandle: row.actorId ? (row.actorHandle ?? FALLBACK_HANDLE) : "System",
    category: row.category as AuditLogCategory,
  }));

  return { groups: groupByDay(entries), actors, hasMore };
}
