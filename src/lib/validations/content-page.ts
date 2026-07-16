import { z } from "zod";

// The six block types a ContentPage's `blocks` JSONB array can hold
// (data-model.md) -- a discriminated union on `type` so each shape
// validates only the fields it actually needs.
export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h2"), text: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("p"), text: z.string().trim().min(1).max(5000) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().trim().min(1).max(500)).min(1).max(50) }),
  z.object({ type: z.literal("quote"), text: z.string().trim().min(1).max(1000) }),
  z.object({ type: z.literal("callout"), text: z.string().trim().min(1).max(1000) }),
  z.object({ type: z.literal("divider") }),
]);
export type Block = z.infer<typeof blockSchema>;

// A page's URL. Bare (no leading slash) and lowercase, matching the
// real `/pages/[slug]` route convention -- see seed-system-pages.ts's
// own note on why data-model.md's leading-slash spelling could never
// route. Hyphen-separated alphanumeric segments only, so a stored slug
// is always URL-safe without escaping and can't smuggle in a path
// separator, a query string, or a leading/trailing hyphen.
export const contentPageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "URL is required.")
  .max(80, "URL must be 80 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens (e.g. house-rules).");

// FR-006: the whole title+slug+blocks payload saves atomically, so this
// is the single trust-boundary schema save-content-page.ts validates
// against (Principle II) -- there's no partial-block-update path.
export const saveContentPageSchema = z.object({
  title: z.string().trim().min(1).max(150),
  slug: contentPageSlugSchema,
  blocks: z.array(blockSchema).max(100),
});
export type SaveContentPageInput = z.infer<typeof saveContentPageSchema>;

export const togglePageStatusSchema = z.object({
  slug: z.string().min(1),
  status: z.enum(["published", "draft"]),
});
export type TogglePageStatusInput = z.infer<typeof togglePageStatusSchema>;
