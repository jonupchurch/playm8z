import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";

type ApplicationRow = typeof applications.$inferSelect;

const ACTIVE = new Set(["pending", "accepted"]);

export type DedupePlan = { loserIds: string[]; groups: number };
export type DedupeReport = { groups: number; deleted: number };

// Pure: among ACTIVE applications (pending/accepted), keep exactly one per
// (postingId, applicantId) and return the ids to delete, plus how many groups had
// duplicates. Winner: `accepted` over `pending` (an accepted row backs a real roster
// seat, so it must never be the one dropped), tie-broken by oldest createdAt then
// smallest id. Terminal rows (declined/withdrawn) are ignored entirely -- they neither
// group nor get deleted. This is the whole of the collapse logic and is tested
// exhaustively in memory, because once the partial unique index exists (046, ADR 0018)
// duplicate active rows are un-insertable and the collapse can't run through the DB.
export function planDedupe(rows: ApplicationRow[]): DedupePlan {
  const groups = new Map<string, ApplicationRow[]>();
  for (const row of rows) {
    if (!ACTIVE.has(row.status)) continue;
    const key = `${row.postingId}|${row.applicantId}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const loserIds: string[] = [];
  let dupGroups = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    dupGroups += 1;
    const keeper = list.reduce((best, row) => (beatsAsKeeper(row, best) ? row : best));
    for (const row of list) if (row.id !== keeper.id) loserIds.push(row.id);
  }
  return { loserIds, groups: dupGroups };
}

// True if `row` is a better keeper than the current `best`.
function beatsAsKeeper(row: ApplicationRow, best: ApplicationRow): boolean {
  const ra = row.status === "accepted";
  const ba = best.status === "accepted";
  if (ra !== ba) return ra; // accepted beats pending
  if (row.createdAt.getTime() !== best.createdAt.getTime()) return row.createdAt < best.createdAt; // older wins
  return row.id < best.id; // stable tie-break: smallest id wins
}

// One-time, idempotent (046, ADR 0018): collapse any pre-existing duplicate ACTIVE
// applications so the partial unique index can be created (it fails while active
// duplicates exist). Runs BEFORE the index; afterwards the index forbids them, making
// this a permanent no-op. `postingIds` scopes the run (tests); omit for all.
export async function dedupeActiveApplications(postingIds?: string[]): Promise<DedupeReport> {
  const rows = postingIds
    ? await db.select().from(applications).where(inArray(applications.postingId, postingIds))
    : await db.select().from(applications);

  const { loserIds, groups } = planDedupe(rows);
  if (loserIds.length) await db.delete(applications).where(inArray(applications.id, loserIds));
  return { groups, deleted: loserIds.length };
}
