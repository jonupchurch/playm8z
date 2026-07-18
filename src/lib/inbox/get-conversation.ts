import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";

const hostUsers = alias(users, "hostUsers");

export type ConversationMessage = {
  id: string;
  senderId: string | null;
  senderHandle: string | null;
  senderAvatarColor: string | null;
  senderAvatarImage: string | null;
  senderImage: string | null;
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
  applicantAvatarImage: string | null;
  applicantImage: string | null;
  postingTitle: string;
  postingGame: string;
  message: string | null;
  createdAt: Date;
  // Public Profile (022): 'host' means this row is an invite THE
  // VIEWER (the invited applicant) received, not a normal request
  // they, as host, need to decide -- request-banner.tsx/page.tsx use
  // this to show "X invited you" instead of "X wants to join."
  initiatedBy: "applicant" | "host";
  hostHandle: string;
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
      ? conversation.name?.trim() || otherMembers.map((member) => `@${member.handle ?? FALLBACK_HANDLE}`).join(", ")
      : `@${otherMembers[0]?.handle ?? FALLBACK_HANDLE}`;

    const messageRows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        senderHandle: users.handle,
        senderAvatarColor: users.avatarColor,
        senderAvatarImage: users.avatarImage,
        senderImage: users.image,
        type: messages.type,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      // Admin Reports (019) -- excludes messages removed via that
      // feature's "Remove content" (research.md #4), same soft-hide
      // exclusion pattern as postings'/forumThreads'/forumReplies' own
      // removedAt-filtered queries. Never un-removed.
      .where(and(eq(messages.conversationId, conversation.id), isNull(messages.removedAt)))
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
      initiatedBy: applications.initiatedBy,
      postingId: postings.id,
      postingHostId: postings.hostId,
      postingTitle: postings.title,
      postingGame: postings.game,
      applicantId: applications.applicantId,
      applicantHandle: users.handle,
      applicantAvatarColor: users.avatarColor,
      applicantAvatarImage: users.avatarImage,
      applicantImage: users.image,
      hostHandle: hostUsers.handle,
    })
    .from(applications)
    .innerJoin(postings, eq(applications.postingId, postings.id))
    .innerJoin(users, eq(applications.applicantId, users.id))
    .innerJoin(hostUsers, eq(postings.hostId, hostUsers.id))
    .where(eq(applications.id, id));

  // Public Profile (022): a host-initiated invite (`initiatedBy =
  // 'host'`) is authorized for the INVITED applicant instead of the
  // posting's host -- the same reversal accept-request.ts/
  // decline-request.ts's own ownership check already applies.
  const authorized =
    request?.initiatedBy === "host" ? request.applicantId === viewerId : request?.postingHostId === viewerId;
  if (!request || !authorized || request.status !== "pending") {
    return null;
  }

  return {
    kind: "request",
    applicationId: request.applicationId,
    postingId: request.postingId,
    applicantHandle: request.applicantHandle ?? FALLBACK_HANDLE,
    applicantAvatarColor: request.applicantAvatarColor,
    applicantAvatarImage: request.applicantAvatarImage,
    applicantImage: request.applicantImage,
    postingTitle: request.postingTitle,
    postingGame: request.postingGame,
    message: request.message,
    createdAt: request.createdAt,
    initiatedBy: request.initiatedBy === "host" ? "host" : "applicant",
    hostHandle: request.hostHandle ?? FALLBACK_HANDLE,
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
