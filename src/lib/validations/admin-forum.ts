import { z } from "zod";

// data-model.md's fixed queue filter set. No separate "reported" filter
// (unlike Admin Postings/017) -- the wireframe's own filter semantics
// only split by content type plus Auto-flagged.
export const forumQueueFilterSchema = z.enum(["all", "threads", "replies", "flagged"]);
export type ForumQueueFilter = z.infer<typeof forumQueueFilterSchema>;

export const searchForumQueueSchema = z.object({
  filter: forumQueueFilterSchema.catch("all"),
});
export type SearchForumQueueInput = z.infer<typeof searchForumQueueSchema>;

export const forumTargetTypeEnum = z.enum(["forumThread", "forumReply"]);
export type ForumTargetType = z.infer<typeof forumTargetTypeEnum>;

// approve/remove/lock/warn share one Server Action (mirrors Admin
// Postings' resolvePostingReport); ban is separate, delegating to Admin
// Users' existing toggle-user-ban.ts.
export const resolveForumReportSchema = z.object({
  targetType: forumTargetTypeEnum,
  targetId: z.string().uuid(),
  resolution: z.enum(["approve", "remove", "lock", "warn"]),
  warningReason: z.string().trim().max(500).optional(),
});
export type ResolveForumReportInput = z.infer<typeof resolveForumReportSchema>;

export const banForumAuthorSchema = z.object({
  targetType: forumTargetTypeEnum,
  targetId: z.string().uuid(),
});
export type BanForumAuthorInput = z.infer<typeof banForumAuthorSchema>;

// The drawer's own URL params (`?targetType=&targetId=`) -- an
// invalid/missing value just means no drawer is open, never a 400/error
// state.
export const forumTargetTypeParamSchema = forumTargetTypeEnum.optional().catch(undefined);
export const forumTargetIdParamSchema = z.string().uuid().optional().catch(undefined);
