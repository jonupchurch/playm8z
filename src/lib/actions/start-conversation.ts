"use server";

import { and, arrayContains, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, users } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { hasActiveBlockBetween } from "@/lib/inbox/search-contacts";
import { startConversationSchema } from "@/lib/validations/inbox";

export type StartConversationResult = { success: true; conversationId: string } | { success: false; error: string };

// FR-005/FR-006: a single recipient reuses an existing direct
// conversation rather than duplicating it; two or more recipients
// always creates a new group. Re-checks the block relationship
// server-side for every recipient (edge case in spec.md) -- the
// compose search's own exclusion is a UX nicety, not the real guard.
export async function startConversation(input: {
  recipientIds: string[];
  groupName?: string;
}): Promise<StartConversationResult> {
  let starter: { id: string };
  try {
    starter = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const recipientIds = [...new Set(parsed.data.recipientIds)].filter((id) => id !== starter.id);
  if (recipientIds.length === 0) {
    return { success: false, error: "Choose at least one person to message." };
  }

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, recipientIds));
  if (recipients.length !== recipientIds.length) {
    return { success: false, error: "One of the selected people wasn't found." };
  }

  for (const recipientId of recipientIds) {
    if (await hasActiveBlockBetween(starter.id, recipientId)) {
      return { success: false, error: "You can't message this person." };
    }
  }

  const isGroup = recipientIds.length > 1;
  const memberIds = [starter.id, ...recipientIds];

  if (!isGroup) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.isGroup, false), arrayContains(conversations.memberIds, memberIds)));

    if (existing) {
      revalidatePath("/inbox", "layout");
      return { success: true, conversationId: existing.id };
    }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ isGroup, name: isGroup ? parsed.data.groupName : null, memberIds })
    .returning({ id: conversations.id });

  // The client navigates to the new conversation right after this
  // resolves -- revalidating server-side (rather than the client
  // calling router.refresh() after router.push()) avoids a real
  // observed race where a client-side refresh() issued immediately
  // after push() can win and revert the navigation back to the old URL.
  revalidatePath("/inbox", "layout");
  return { success: true, conversationId: conversation.id };
}
