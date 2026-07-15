import { z } from "zod";

// data-model.md's fixed status/system-filter set. "system" reads the
// stored `system` column (research.md #2), not a computed value.
export const contentPageFilterSchema = z.enum(["all", "published", "draft", "system"]);
export type ContentPageFilter = z.infer<typeof contentPageFilterSchema>;

// A visitor-controlled URL query string feeds this into search-
// content-pages.ts (Principle II) -- research.md #5's fetch-all-then-
// filter pattern, so this validates the filter inputs, not a SQL WHERE
// boundary.
export const searchContentPagesSchema = z.object({
  q: z.string().max(200).optional().default(""),
  filter: contentPageFilterSchema.catch("all"),
});
export type ContentPagesFilters = z.infer<typeof searchContentPagesSchema>;

export const deleteContentPageSchema = z.object({
  pageId: z.string().uuid(),
});
export type DeleteContentPageInput = z.infer<typeof deleteContentPageSchema>;
