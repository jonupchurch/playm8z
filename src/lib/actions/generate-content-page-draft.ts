"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { generateStructuredDraft } from "@/lib/ai/gateway";
import {
  contentPageDraftSchema,
  writingAssistTopicSchema,
  type ContentPageDraft,
} from "@/lib/validations/ai-writing-assist";

export type GenerateContentPageDraftInput = { topic: string };
export type GenerateContentPageDraftResult =
  | { success: true; draft: ContentPageDraft }
  | { success: false; error: string };

const SYSTEM_PROMPT =
  "You write Content Pages for playm8z, a game-LFG community platform, using these block types only: " +
  "h2 (heading), p (paragraph), list (bulleted items), quote, callout, divider. Produce 3-8 blocks that " +
  "together read as a complete page on the given topic.";

// FR-001/FR-002: admin-only, same gate as generate-news-draft.ts.
export async function generateContentPageDraft(
  input: GenerateContentPageDraftInput,
): Promise<GenerateContentPageDraftResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsedTopic = writingAssistTopicSchema.safeParse(input.topic);
  if (!parsedTopic.success) {
    return { success: false, error: parsedTopic.error.issues[0]?.message ?? "Invalid topic." };
  }

  let draft: ContentPageDraft;
  try {
    draft = await generateStructuredDraft(contentPageDraftSchema, SYSTEM_PROMPT, `Topic: ${parsedTopic.data}`);
  } catch {
    return { success: false, error: "Couldn't generate a draft right now. Please try again." };
  }

  await logAuditEntry({
    actorId: admin.id,
    action: "used AI writing assist to write a Content Page draft from scratch",
    category: "content",
    meta: { actionType: "write-from-scratch", surface: "contentPage" },
  });

  return { success: true, draft };
}
