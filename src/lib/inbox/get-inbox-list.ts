import { and, arrayOverlaps, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";

export type InboxItem = {
  kind: "conversation" | "request";
  id: string;
  isGroup: boolean;
  name: string;
  context: string;
  preview: string;
  lastActivityAt: Date;
  unreadCount: number;
  avatarColor: string | null;
  postingId?: string;
};

// FR-002: unions real conversations the user belongs to with pending
// Applications on postings they host, sorted by most recent activity
// (data-model.md's "merged inbox list"). Request items have no
// conversations/messages row yet (research.md #1), so their "unread"
// state is simplified to "always needs attention while pending" --
// there's no per-request read cursor to track, unlike a real
// conversation's `lastReadAt` map.
export async function getInboxList(userId: string): Promise<InboxItem[]> {
  const userConversations = await db
    .select()
    .from(conversations)
    .where(arrayOverlaps(conversations.memberIds, [userId]));

  const conversationItems: InboxItem[] = await Promise.all(
    userConversations.map(async (conversation) => {
      const otherMemberIds = conversation.memberIds.filter((id) => id !== userId);
      const members = otherMemberIds.length
        ? await db
            .select({ id: users.id, handle: users.handle, avatarColor: users.avatarColor })
            .from(users)
            .where(inArray(users.id, otherMemberIds))
        : [];

      const name = conversation.isGroup
        ? conversation.name?.trim() || members.map((member) => `@${member.handle ?? "player"}`).join(", ")
        : `@${members[0]?.handle ?? "player"}`;

      const [lastMessage] = await db
        .select({ body: messages.body })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const lastReadAtRaw = conversation.lastReadAt?.[userId];
      const lastReadAt = lastReadAtRaw ? new Date(lastReadAtRaw) : conversation.createdAt;
      const [unread] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            gt(messages.createdAt, lastReadAt),
            or(isNull(messages.senderId), ne(messages.senderId, userId)),
          ),
        );

      return {
        kind: "conversation" as const,
        id: conversation.id,
        isGroup: conversation.isGroup,
        name,
        context: conversation.isGroup ? `Group · ${conversation.memberIds.length} members` : "Direct message",
        preview: lastMessage?.body ?? "",
        lastActivityAt: conversation.lastMessageAt,
        unreadCount: unread?.count ?? 0,
        avatarColor: conversation.isGroup ? null : (members[0]?.avatarColor ?? null),
      };
    }),
  );

  const pendingRequests = await db
    .select({
      applicationId: applications.id,
      message: applications.message,
      createdAt: applications.createdAt,
      postingId: postings.id,
      postingTitle: postings.title,
      postingGame: postings.game,
      applicantHandle: users.handle,
      applicantAvatarColor: users.avatarColor,
    })
    .from(applications)
    .innerJoin(postings, eq(applications.postingId, postings.id))
    .innerJoin(users, eq(applications.applicantId, users.id))
    .where(and(eq(postings.hostId, userId), eq(applications.status, "pending")));

  const requestItems: InboxItem[] = pendingRequests.map((request) => ({
    kind: "request" as const,
    id: request.applicationId,
    isGroup: false,
    name: `@${request.applicantHandle ?? "player"}`,
    context: `${request.postingGame} · ${request.postingTitle}`,
    preview: request.message?.trim() || "Wants to join your party.",
    lastActivityAt: request.createdAt,
    unreadCount: 1,
    avatarColor: request.applicantAvatarColor,
    postingId: request.postingId,
  }));

  return [...conversationItems, ...requestItems].sort(
    (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
  );
}
