import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";
import { getInboxList } from "./get-inbox-list";
import { getUnreadMessageCount } from "./get-unread-message-count";

// Every message and conversation gets an explicit JS Date createdAt from
// one clock -- never mixed with the schema default -- so relative order is
// deterministic (a JS Date and Postgres's defaultNow() can skew by hours
// on a timestamp-without-tz column).
const MIN = 60_000;
const now = Date.now();

describe("getUnreadMessageCount (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const aEmail = `unread-a-${runId}@example.com`;
  const bEmail = `unread-b-${runId}@example.com`;
  const cEmail = `unread-c-${runId}@example.com`;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let directId: string;
  let groupId: string;

  beforeAll(async () => {
    const [a] = await db.insert(users).values({ email: aEmail, handle: `unreada${runId}` }).returning({ id: users.id });
    userAId = a.id;
    const [b] = await db.insert(users).values({ email: bEmail, handle: `unreadb${runId}` }).returning({ id: users.id });
    userBId = b.id;
    const [c] = await db.insert(users).values({ email: cEmail, handle: `unreadc${runId}` }).returning({ id: users.id });
    userCId = c.id;

    // Direct A+B. A last read 30m ago. Unread for A = B's new message
    // (-5m) + the system message (-2m); NOT the old read one (-60m) and
    // NOT A's own reply (-3m).
    const [direct] = await db
      .insert(conversations)
      .values({ memberIds: [userAId, userBId], createdAt: new Date(now - 90 * MIN), lastMessageAt: new Date(now - 2 * MIN) })
      .returning({ id: conversations.id });
    directId = direct.id;

    await db.insert(messages).values([
      { conversationId: directId, senderId: userBId, body: "old read", createdAt: new Date(now - 60 * MIN) },
      { conversationId: directId, senderId: userBId, body: "new unread", createdAt: new Date(now - 5 * MIN) },
      { conversationId: directId, senderId: userAId, body: "my own reply", createdAt: new Date(now - 3 * MIN) },
      { conversationId: directId, senderId: null, body: "system event", createdAt: new Date(now - 2 * MIN) },
    ]);

    await db
      .update(conversations)
      .set({ lastReadAt: { [userAId]: new Date(now - 30 * MIN).toISOString() } })
      .where(eq(conversations.id, directId));

    // Group A+B+C, nobody has a read cursor -> threshold is the
    // conversation's createdAt (-20m). Unread for A = C's (-10m) + B's
    // (-8m) = 2. Unread for C = B's (-8m) only (C's own doesn't count) = 1.
    const [group] = await db
      .insert(conversations)
      .values({
        isGroup: true,
        memberIds: [userAId, userBId, userCId],
        createdAt: new Date(now - 20 * MIN),
        lastMessageAt: new Date(now - 8 * MIN),
      })
      .returning({ id: conversations.id });
    groupId = group.id;

    await db.insert(messages).values([
      { conversationId: groupId, senderId: userCId, body: "group from C", createdAt: new Date(now - 10 * MIN) },
      { conversationId: groupId, senderId: userBId, body: "group from B", createdAt: new Date(now - 8 * MIN) },
    ]);
  });

  afterAll(async () => {
    await db.delete(messages).where(eq(messages.conversationId, directId));
    await db.delete(messages).where(eq(messages.conversationId, groupId));
    await db.delete(conversations).where(eq(conversations.id, directId));
    await db.delete(conversations).where(eq(conversations.id, groupId));
    await db.delete(users).where(eq(users.email, aEmail));
    await db.delete(users).where(eq(users.email, bEmail));
    await db.delete(users).where(eq(users.email, cEmail));
  });

  it("counts unread from others and system messages, excluding own and already-read", async () => {
    // Direct: new(-5) + system(-2) = 2; Group: C(-10) + B(-8) = 2 => 4.
    expect(await getUnreadMessageCount(userAId)).toBe(4);
  });

  it("never counts the viewer's own messages", async () => {
    // C's only unread is B's group message (-8); C's own (-10) is excluded.
    expect(await getUnreadMessageCount(userCId)).toBe(1);
  });

  it("returns 0 for a viewer with no conversations", async () => {
    expect(await getUnreadMessageCount("00000000-0000-0000-0000-000000000000")).toBe(0);
  });

  it("returns 0 once the viewer has read past every message", async () => {
    await db
      .update(conversations)
      .set({ lastReadAt: sql`${conversations.lastReadAt} || ${JSON.stringify({ [userCId]: new Date().toISOString() })}::jsonb` })
      .where(eq(conversations.id, groupId));
    expect(await getUnreadMessageCount(userCId)).toBe(0);
  });

  it("matches the sum of getInboxList's real-conversation unread counts (SC-002 parity)", async () => {
    const list = await getInboxList(userAId);
    const inboxSum = list
      .filter((item) => item.kind === "conversation")
      .reduce((total, item) => total + item.unreadCount, 0);
    expect(await getUnreadMessageCount(userAId)).toBe(inboxSum);
  });
});
