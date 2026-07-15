import { z } from "zod";
import { NEWS_CATEGORIES } from "@/lib/validations/news";

// data-model.md's fixed list-filter set.
export const newsPostFilterSchema = z.enum(["all", "published", "draft", "scheduled"]);
export type NewsPostFilter = z.infer<typeof newsPostFilterSchema>;

// research.md #1: one save action, discriminated by what the moderator
// actually clicked -- every one of the wireframe's footer actions
// (Publish now/Update/Schedule/Save draft/Delete) is really the same
// row getting a different status/publishedAt/featured combination.
export const saveNewsPostActionEnum = z.enum(["publish", "schedule", "save-draft", "delete"]);
export type SaveNewsPostAction = z.infer<typeof saveNewsPostActionEnum>;

export const saveNewsPostSchema = z
  .object({
    postId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    excerpt: z.string().trim().min(1).max(120),
    body: z.string().max(20000),
    category: z.enum(NEWS_CATEGORIES),
    cover: z.string().min(1),
    featured: z.boolean().default(false),
    action: saveNewsPostActionEnum,
    // Required (and validated as a real future date) only when
    // action === "schedule" -- the refinement below enforces that.
    publishDate: z.coerce.date().optional(),
  })
  .refine((data) => data.action !== "schedule" || (data.publishDate !== undefined && data.publishDate.getTime() > Date.now()), {
    message: "A future publish date is required to schedule a post.",
    path: ["publishDate"],
  });
export type SaveNewsPostInput = z.input<typeof saveNewsPostSchema>;

// The list's own URL param (`?postId=`) -- an invalid/missing value
// just means the editor shows a blank new-post form, never a 400/error
// state (same convention as every other admin drawer/editor param).
export const newsPostIdParamSchema = z.string().uuid().optional().catch(undefined);
