import { z } from "zod";

// data-model.md's real, stored 4-value category -- the badge/filter
// never invents a finer classification than this (research.md #1).
export const auditCategoryFilterSchema = z.enum(["all", "moderation", "content", "access", "system"]);
export type AuditCategoryFilter = z.infer<typeof auditCategoryFilterSchema>;

// "all", "system" (actorId is null), or a real actor's user id -- a
// union with .catch() so a tampered/garbage value degrades to "all"
// instead of ever reaching a `uuid` column comparison with a
// non-uuid string (which Postgres would reject outright).
export const auditLogActorFilterSchema = z.union([z.literal("all"), z.literal("system"), z.string().uuid()]).catch("all");
export type AuditLogActorFilter = z.infer<typeof auditLogActorFilterSchema>;

// A visitor-controlled URL query string feeds this into get-audit-log.ts's
// query (Principle II), same pattern as Browse's/Admin Users' own
// searchParams schemas.
export const searchAuditLogSchema = z.object({
  q: z.string().max(200).optional().default(""),
  actor: auditLogActorFilterSchema,
  category: auditCategoryFilterSchema.catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SearchAuditLogInput = z.infer<typeof searchAuditLogSchema>;
