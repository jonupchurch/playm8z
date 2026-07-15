"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { reviseText } from "@/lib/ai/gateway";
import { writingAssistTextSchema } from "@/lib/validations/ai-writing-assist";

export type ImproveDraftTextInput = { text: string; surface: "news" | "contentPage" };
export type ImproveDraftTextResult = { success: true; text: string } | { success: false; error: string };

const SYSTEM_PROMPT =
  "You improve/rewrite a single piece of already-drafted text for playm8z, a game-LFG community platform. " +
  "Return only the revised text itself, matching the original's length and format (plain text or markdown) -- " +
  "no preamble, no explanation, no surrounding quotes.";

// research.md #3: surface-agnostic -- always plain text in, plain text
// out, so this one action serves both news-post-editor.tsx (the body
// field directly) and page-editor.tsx (a block's text via its own
// existing blockToText/withText round-trip). FR-001/FR-002: admin-only,
// same gate as generate-news-draft.ts/generate-content-page-draft.ts.
export async function improveDraftText(input: ImproveDraftTextInput): Promise<ImproveDraftTextResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsedText = writingAssistTextSchema.safeParse(input.text);
  if (!parsedText.success) {
    return { success: false, error: parsedText.error.issues[0]?.message ?? "Nothing to improve yet." };
  }

  let revised: string;
  try {
    revised = await reviseText(SYSTEM_PROMPT, parsedText.data);
  } catch {
    return { success: false, error: "Couldn't revise this right now. Please try again." };
  }

  await logAuditEntry({
    actorId: admin.id,
    action: "used AI writing assist to improve/rewrite existing draft text",
    category: "content",
    meta: { actionType: "improve-rewrite", surface: input.surface },
  });

  return { success: true, text: revised };
}
