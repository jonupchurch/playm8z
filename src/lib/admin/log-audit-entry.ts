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

// FR-007: the reusable mechanism future admin features (Admin Users/
// Postings/Forum/News -- none spec'd yet) will call to record an
// entry. Nothing calls this yet (research.md #3); ships fully built
// and tested so those features can adopt it directly once they exist.
// Append-only, matching auditEntries' own no-update/no-delete design.
export async function logAuditEntry(input: LogAuditEntryInput): Promise<void> {
  const parsed = logAuditEntrySchema.parse(input);
  await db.insert(auditEntries).values(parsed);
}
