"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { sendMessageSchema } from "@/lib/validations/inbox";

export type SendMessageResult = { success: true } | { success: false; error: string };

// FR-004: rejects a sender who isn't an actual member of the
// conversation. Updates `lastMessageAt` for list ordering and marks
// the sender's own `lastReadAt` as now -- Acceptance Scenario 3 (US1)
// requires unread state to clear for the sender's own view immediately.
export async function sendMessage(input: { conversationId: string; body: string }): Promise<SendMessageResult> {
  let sender: { id: string };
  try {
    sender = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [conversation] = await db
    .select({ id: conversations.id, memberIds: conversations.memberIds })
    .from(conversations)
    .where(eq(conversations.id, parsed.data.conversationId));

  if (!conversation || !conversation.memberIds.includes(sender.id)) {
    return { success: false, error: "This conversation wasn't found." };
  }

  const now = new Date();
  await db.insert(messages).values({
    conversationId: parsed.data.conversationId,
    senderId: sender.id,
    body: parsed.data.body,
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastReadAt: sql`${conversations.lastReadAt} || ${JSON.stringify({ [sender.id]: now.toISOString() })}::jsonb`,
    })
    .where(eq(conversations.id, parsed.data.conversationId));

  return { success: true };
}
