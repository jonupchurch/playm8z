import { and, arrayOverlaps, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";

// Total unread direct/group MESSAGES for one viewer, for the top-nav
// Messages badge (037). Runs in SiteHeader on every authenticated page
// render, so it MUST be a fixed number of queries -- two, regardless of
// how many conversations the viewer has -- not get-inbox-list.ts's
// per-conversation fan-out (fine for the inbox page, wrong for a nav
// badge on every page).
//
// The count MUST equal the sum of get-inbox-list.ts's per-conversation
// `unreadCount`s for the same viewer (SC-002 -- the nav badge must never
// disagree with the inbox page). That parity holds only by using the
// IDENTICAL unread rule: threshold = the viewer's own `lastReadAt` cursor
// (or the conversation's createdAt when they've never opened it), and a
// message counts when it was created after that threshold AND wasn't sent
// by the viewer. The threshold is computed in JS as a Date and compared
// in SQL -- the same mechanism get-inbox-list.ts uses (drizzle passes the
// Date as a bound param), which is what makes the two agree. `removedAt`
// (moderator-hidden messages, 019) is deliberately NOT filtered here,
// exactly as get-inbox-list.ts's unread count doesn't filter it; if that
// ever changes it must change in BOTH places together.
//
// Counts messages only -- never pending party requests or host invites.
// Those surface in the notification bell; counting them here too would
// double-count the same event across two nav icons (spec FR-003).
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: conversations.id, lastReadAt: conversations.lastReadAt, createdAt: conversations.createdAt })
    .from(conversations)
    .where(arrayOverlaps(conversations.memberIds, [userId]));

  if (rows.length === 0) return 0;

  const perConversation = rows.map((row) => {
    const lastReadAtRaw = row.lastReadAt?.[userId];
    const threshold = lastReadAtRaw ? new Date(lastReadAtRaw) : row.createdAt;
    return and(eq(messages.conversationId, row.id), gt(messages.createdAt, threshold));
  });

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(or(...perConversation), or(isNull(messages.senderId), ne(messages.senderId, userId))));

  return result?.count ?? 0;
}
