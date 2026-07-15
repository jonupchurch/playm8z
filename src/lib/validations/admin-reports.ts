import { z } from "zod";

// data-model.md's fixed queue filter set -- matches `reports.targetType`'s
// own real stored values directly (no separate "profile"/"forum-thread"
// mapping needed).
export const reportsQueueFilterSchema = z.enum(["all", "posting", "forum", "user", "message"]);
export type ReportsQueueFilter = z.infer<typeof reportsQueueFilterSchema>;

export const searchReportsQueueSchema = z.object({
  filter: reportsQueueFilterSchema.catch("all"),
});
export type SearchReportsQueueInput = z.infer<typeof searchReportsQueueSchema>;

export const reportTargetTypeEnum = z.enum(["posting", "forum", "user", "message"]);
export type ReportTargetType = z.infer<typeof reportTargetTypeEnum>;

// Dismiss is one generic action, any target type (research.md #2).
export const dismissReportSchema = z.object({
  targetType: reportTargetTypeEnum,
  targetId: z.string().uuid(),
});
export type DismissReportInput = z.infer<typeof dismissReportSchema>;

// Remove/Warn share one Server Action, branching by target type
// (research.md #2) -- delegates to `017`'s/`018`'s own actions for
// posting/forum, handles message/profile directly. Ban is separate
// (`ban-reported-user.ts`), delegating to Admin Users' (016) existing
// `toggle-user-ban.ts`.
export const resolveReportActionSchema = z.object({
  targetType: reportTargetTypeEnum,
  targetId: z.string().uuid(),
  resolution: z.enum(["remove", "warn"]),
  warningReason: z.string().trim().max(500).optional(),
});
export type ResolveReportActionInput = z.infer<typeof resolveReportActionSchema>;

export const banReportedUserSchema = z.object({
  targetType: reportTargetTypeEnum,
  targetId: z.string().uuid(),
});
export type BanReportedUserInput = z.infer<typeof banReportedUserSchema>;

// The drawer's own URL params (`?targetType=&targetId=`) -- an
// invalid/missing value just means no drawer is open, never a 400/error
// state (same convention as Admin Forum's own two-param drawer).
export const reportTargetTypeParamSchema = reportTargetTypeEnum.optional().catch(undefined);
export const reportTargetIdParamSchema = z.string().uuid().optional().catch(undefined);
