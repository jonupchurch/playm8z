import { z } from "zod";

// Server-side boundary for post-reply.ts (Principle II).
export const postReplySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
  quotedReplyId: z.string().uuid().optional(),
});

export type PostReplyInput = z.infer<typeof postReplySchema>;

// Server-side boundary for toggle-like.ts.
export const toggleLikeSchema = z.object({
  targetType: z.enum(["thread", "reply"]),
  targetId: z.string().uuid(),
});

export type ToggleLikeInput = z.infer<typeof toggleLikeSchema>;

// Server-side boundary for report-forum-content.ts. `reason` isn't
// collected here, same as Blocked Users' own Report writes -- no
// reason taxonomy exists yet.
export const reportForumContentSchema = z.object({
  targetId: z.string().uuid(),
});

export type ReportForumContentInput = z.infer<typeof reportForumContentSchema>;

// Server-side boundary for toggle-subscription.ts.
export const toggleSubscriptionSchema = z.object({
  threadId: z.string().uuid(),
});

export type ToggleSubscriptionInput = z.infer<typeof toggleSubscriptionSchema>;

export const replySortSchema = z.enum(["top", "new", "old"]).catch("top");
export type ReplySort = z.infer<typeof replySortSchema>;
