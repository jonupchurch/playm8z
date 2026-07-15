import { z } from "zod";
import { blockSchema } from "@/lib/validations/content-page";

// research.md #4: both inbound inputs are validated before any AI call
// is made -- bounds cost/abuse, not identity (the session itself is
// already gated to `admin` by requireRole).
export const writingAssistTopicSchema = z.string().trim().min(1).max(300);
export const writingAssistTextSchema = z.string().trim().min(1).max(20000);

// research.md #2: "Write from scratch" output shapes -- validated by
// the very schema passed to Output.object(), not re-validated
// separately (the SDK will not return non-conforming data).
export const newsDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(20000),
});
export type NewsDraft = z.infer<typeof newsDraftSchema>;

// Reuses content-page.ts's existing blockSchema (already the exact
// ContentBlock discriminated union save-content-page.ts validates
// against) rather than redefining it.
export const contentPageDraftSchema = z.object({
  blocks: z.array(blockSchema).min(1).max(100),
});
export type ContentPageDraft = z.infer<typeof contentPageDraftSchema>;
