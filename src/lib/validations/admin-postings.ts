import { z } from "zod";

// data-model.md's fixed queue filter set.
export const postingQueueFilterSchema = z.enum(["all", "reported", "flagged"]);
export type PostingQueueFilter = z.infer<typeof postingQueueFilterSchema>;

export const searchPostingQueueSchema = z.object({
  filter: postingQueueFilterSchema.catch("all"),
});
export type SearchPostingQueueInput = z.infer<typeof searchPostingQueueSchema>;

// approve/remove/warn share one Server Action (research.md); ban is a
// separate action delegating to Admin Users' existing toggle-user-ban.ts.
export const resolvePostingReportSchema = z.object({
  postingId: z.string().uuid(),
  resolution: z.enum(["approve", "remove", "warn"]),
  warningReason: z.string().trim().max(500).optional(),
});
export type ResolvePostingReportInput = z.infer<typeof resolvePostingReportSchema>;

export const banPostingAuthorSchema = z.object({
  postingId: z.string().uuid(),
});
export type BanPostingAuthorInput = z.infer<typeof banPostingAuthorSchema>;

// The drawer's own URL param (`?postingId=`) -- an invalid/missing
// value just means no drawer is open, never a 400/error state.
export const postingIdParamSchema = z.string().uuid().optional().catch(undefined);
