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

// FR-006: the whole title+blocks array saves atomically, so this is
// the single trust-boundary schema save-content-page.ts validates
// against (Principle II) -- there's no partial-block-update path.
export const saveContentPageSchema = z.object({
  title: z.string().trim().min(1).max(150),
  blocks: z.array(blockSchema).max(100),
});
export type SaveContentPageInput = z.infer<typeof saveContentPageSchema>;

export const togglePageStatusSchema = z.object({
  slug: z.string().min(1),
  status: z.enum(["published", "draft"]),
});
export type TogglePageStatusInput = z.infer<typeof togglePageStatusSchema>;
