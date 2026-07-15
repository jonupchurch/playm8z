import { z } from "zod";

// Server-side boundary for toggle-news-like.ts and
// toggle-saved-news-post.ts (Principle II, data-model.md) -- both
// actions take the same single field.
export const newsArticleTargetSchema = z.object({
  newsPostId: z.string().uuid(),
});
export type NewsArticleTargetInput = z.infer<typeof newsArticleTargetSchema>;
