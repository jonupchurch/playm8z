import { z } from "zod";
import { db } from "@/db";
import { auditEntries } from "@/db/schema";

const logAuditEntrySchema = z.object({
  actorId: z.string().uuid().nullable().optional(),
  action: z.string().trim().min(1).max(200),
  category: z.enum(["moderation", "content", "access", "system"]),
  targetType: z.string().trim().max(50).optional(),
  targetId: z.string().uuid().optional(),
  targetLabel: z.string().trim().max(200).optional(),
  reason: z.string().trim().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type LogAuditEntryInput = z.input<typeof logAuditEntrySchema>;

// FR-007: the reusable mechanism admin features call to record an entry.
// Append-only, matching auditEntries' own no-update/no-delete design.
//
// Validation still throws (a malformed call is a programmer error worth
// surfacing in dev/test), but the INSERT is best-effort: every caller
// records the entry AFTER its real mutation has already committed (a ban,
// a removal, a password reset). A transient DB failure on this secondary
// write must not surface as a failure of that already-durable action --
// the caller would report an error for work that actually succeeded, and
// a retry could double-apply it. Same never-throw-after-commit contract
// send-email.ts holds, for the same reason. The failure is logged loudly
// so a dropped entry is still visible in server logs.
export async function logAuditEntry(input: LogAuditEntryInput): Promise<void> {
  const parsed = logAuditEntrySchema.parse(input);
  try {
    await db.insert(auditEntries).values(parsed);
  } catch (err) {
    console.error(`[audit] failed to record "${parsed.action}":`, err);
  }
}
