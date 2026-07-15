"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireRole } from "@/lib/auth/require-role";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";
import { generateStructuredDraft } from "@/lib/ai/gateway";
import { newsDraftSchema, writingAssistTopicSchema, type NewsDraft } from "@/lib/validations/ai-writing-assist";

export type GenerateNewsDraftInput = { topic: string };
export type GenerateNewsDraftResult = { success: true; draft: NewsDraft } | { success: false; error: string };

const SYSTEM_PROMPT =
  "You write News posts for playm8z, a game-LFG community platform. Write a title (max 120 chars), " +
  "a one-sentence excerpt (max 120 chars), and a markdown body. Match a friendly, community-newsletter tone.";

// FR-001/FR-002: admin-only (stricter than every other admin page's
// moderator minimum), matching Admin Settings' (024) own precedent --
// this is the first feature to call an external AI provider.
export async function generateNewsDraft(input: GenerateNewsDraftInput): Promise<GenerateNewsDraftResult> {
  await requireRole("admin");
  const admin = await requireAuth();

  const parsedTopic = writingAssistTopicSchema.safeParse(input.topic);
  if (!parsedTopic.success) {
    return { success: false, error: parsedTopic.error.issues[0]?.message ?? "Invalid topic." };
  }

  let draft: NewsDraft;
  try {
    draft = await generateStructuredDraft(newsDraftSchema, SYSTEM_PROMPT, `Topic: ${parsedTopic.data}`);
  } catch {
    return { success: false, error: "Couldn't generate a draft right now. Please try again." };
  }

  await logAuditEntry({
    actorId: admin.id,
    action: "used AI writing assist to write a News draft from scratch",
    category: "content",
    meta: { actionType: "write-from-scratch", surface: "news" },
  });

  return { success: true, draft };
}
