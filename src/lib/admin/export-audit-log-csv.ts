import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import type { SearchAuditLogInput } from "@/lib/validations/audit-log";
import { buildAuditLogConditions } from "./get-audit-log";

const CSV_HEADER = ["createdAt", "actor", "action", "category", "targetType", "targetLabel", "reason", "meta"];

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// FR-005/research.md #5: re-runs get-audit-log.ts's exact same filter
// conditions (search/actor/category), unpaginated -- "what's on screen
// is what exports," never the full unfiltered table.
export async function exportAuditLogCsv(filters: Pick<SearchAuditLogInput, "q" | "actor" | "category">): Promise<string> {
  const conditions = buildAuditLogConditions(filters);

  const rows = await db
    .select({
      actorId: auditEntries.actorId,
      actorHandle: users.handle,
      action: auditEntries.action,
      category: auditEntries.category,
      targetType: auditEntries.targetType,
      targetLabel: auditEntries.targetLabel,
      reason: auditEntries.reason,
      meta: auditEntries.meta,
      createdAt: auditEntries.createdAt,
    })
    .from(auditEntries)
    .leftJoin(users, eq(auditEntries.actorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditEntries.createdAt));

  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    const actor = row.actorId ? (row.actorHandle ?? "player") : "System";
    const cells = [
      row.createdAt.toISOString(),
      actor,
      row.action,
      row.category,
      row.targetType ?? "",
      row.targetLabel ?? "",
      row.reason ?? "",
      row.meta ? JSON.stringify(row.meta) : "",
    ];
    lines.push(cells.map((cell) => escapeCsvCell(cell)).join(","));
  }

  return lines.join("\n");
}
