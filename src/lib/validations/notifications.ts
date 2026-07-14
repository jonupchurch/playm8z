import { z } from "zod";

// data-model.md's fixed reason taxonomy.
export const reportReasonEnum = z.enum([
  "spam",
  "harassment",
  "inappropriate",
  "underage",
  "impersonation",
  "other",
]);
export type ReportReason = z.infer<typeof reportReasonEnum>;

// reports.targetType's existing enum (008-blocked-users).
export const reportTargetTypeEnum = z.enum(["user", "posting", "forum", "message"]);
export type ReportTargetType = z.infer<typeof reportTargetTypeEnum>;

// Server-side boundary for submit-report.ts (Principle II). `blockUserId`
// is decoupled from `targetId` -- reporting a posting/forum
// thread/message targets that content, but "Also block" blocks the
// *person* behind it (e.g. a posting's host), which isn't always the
// same id as what's being reported. The caller (report-modal.tsx)
// supplies it whenever it knows who that person is; omitted, "Also
// block" has nothing to act on.
export const submitReportSchema = z.object({
  targetType: reportTargetTypeEnum,
  targetId: z.string().uuid(),
  reason: reportReasonEnum,
  details: z.string().trim().max(1000).optional(),
  alsoBlock: z.boolean().default(false),
  blockUserId: z.string().uuid().optional(),
});
// The input (pre-default) shape -- `alsoBlock` has a schema default,
// so callers may omit it; z.infer would give the post-default output
// shape instead, where it's required.
export type SubmitReportInput = z.input<typeof submitReportSchema>;

// Server-side boundary shared by mark-notification-read.ts.
export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
