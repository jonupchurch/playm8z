import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";

export type ConversationMessage = {
  id: string;
  senderId: string | null;
  senderHandle: string | null;
  senderAvatarColor: string | null;
  type: string;
  body: string;
  createdAt: Date;
};

export type ConversationView = {
  kind: "conversation";
  id: string;
  isGroup: boolean;
  name: string;
  context: string;
  messages: ConversationMessage[];
};

export type RequestView = {
  kind: "request";
  applicationId: string;
  postingId: string;
  applicantHandle: string;
  applicantAvatarColor: string | null;
  postingTitle: string;
  postingGame: string;
  message: string | null;
  createdAt: Date;
};

// FR-004/FR-007: `/inbox/[id]` addresses either a real conversation or
// a still-pending Application (no Conversation row exists for the
// latter until accepted, research.md #1) -- this looks up both by the
// same id and returns whichever the viewer is actually allowed to see.
export async function getConversationOrRequest(
  id: string,
  viewerId: string,
): Promise<ConversationView | RequestView | null> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));

  if (conversation) {
    if (!conversation.memberIds.includes(viewerId)) return null;

    const otherMemberIds = conversation.memberIds.filter((memberId) => memberId !== viewerId);
    const otherMembers = otherMemberIds.length
      ? await db
          .select({ id: users.id, handle: users.handle })
          .from(users)
          .where(inArray(users.id, otherMemberIds))
      : [];

    const name = conversation.isGroup
      ? conversation.name?.trim() || otherMembers.map((member) => `@${member.handle ?? "player"}`).join(", ")
      : `@${otherMembers[0]?.handle ?? "player"}`;

    const messageRows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        senderHandle: users.handle,
        senderAvatarColor: users.avatarColor,
        type: messages.type,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(asc(messages.createdAt));

    return {
      kind: "conversation",
      id: conversation.id,
      isGroup: conversation.isGroup,
      name,
      context: conversation.isGroup ? `Group · ${conversation.memberIds.length} members` : "Direct message",
      messages: messageRows,
    };
  }

  const [request] = await db
    .select({
      applicationId: applications.id,
      status: applications.status,
      message: applications.message,
      createdAt: applications.createdAt,
      postingId: postings.id,
      postingHostId: postings.hostId,
      postingTitle: postings.title,
      postingGame: postings.game,
      applicantHandle: users.handle,
      applicantAvatarColor: users.avatarColor,
    })
    .from(applications)
    .innerJoin(postings, eq(applications.postingId, postings.id))
    .innerJoin(users, eq(applications.applicantId, users.id))
    .where(eq(applications.id, id));

  if (!request || request.postingHostId !== viewerId || request.status !== "pending") {
    return null;
  }

  return {
    kind: "request",
    applicationId: request.applicationId,
    postingId: request.postingId,
    applicantHandle: request.applicantHandle ?? "player",
    applicantAvatarColor: request.applicantAvatarColor,
    postingTitle: request.postingTitle,
    postingGame: request.postingGame,
    message: request.message,
    createdAt: request.createdAt,
  };
}

// Side effect of viewing a real conversation (same "read triggers a
// write" pattern as Forum Thread's incrementViewCount) -- marks the
// viewer's own lastReadAt as now, clearing their unread count.
export async function markConversationRead(conversationId: string, viewerId: string): Promise<void> {
  await db
    .update(conversations)
    .set({
      lastReadAt: sql`${conversations.lastReadAt} || ${JSON.stringify({ [viewerId]: new Date().toISOString() })}::jsonb`,
    })
    .where(eq(conversations.id, conversationId));
}
