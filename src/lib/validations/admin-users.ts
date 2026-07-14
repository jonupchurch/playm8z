import { z } from "zod";

// data-model.md's fixed status-filter set. "flagged"/"active" are both
// computed (research.md #3), never stored -- this filter reads that
// same computed value, not a distinct column.
export const adminUserStatusFilterSchema = z.enum(["all", "active", "flagged", "banned"]);
export type AdminUserStatusFilter = z.infer<typeof adminUserStatusFilterSchema>;

// A visitor-controlled URL query string feeds this into search-admin-
// users.ts's query (Principle II), same pattern as browse-filters.ts.
export const searchAdminUsersSchema = z.object({
  q: z.string().max(200).optional().default(""),
  status: adminUserStatusFilterSchema.catch("all"),
});
export type AdminUsersFilters = z.infer<typeof searchAdminUsersSchema>;

export const toggleUserBanSchema = z.object({
  userId: z.string().uuid(),
});
export type ToggleUserBanInput = z.infer<typeof toggleUserBanSchema>;

export const removeUserContentSchema = z.object({
  contentType: z.enum(["posting", "forumThread"]),
  contentId: z.string().uuid(),
});
export type RemoveUserContentInput = z.infer<typeof removeUserContentSchema>;

// The drawer's own URL param (`?userId=`) -- an invalid/missing value
// just means no drawer is open, never a 400/error state.
export const adminUserIdParamSchema = z.string().uuid().optional().catch(undefined);
