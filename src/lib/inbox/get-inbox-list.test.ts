import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";
import { getInboxList } from "./get-inbox-list";

describe("getInboxList (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const aEmail = `inbox-a-${runId}@example.com`;
  const bEmail = `inbox-b-${runId}@example.com`;
  const cEmail = `inbox-c-${runId}@example.com`;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let directConversationId: string;
  let groupConversationId: string;
  let postingId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ email: aEmail, handle: `inboxa${runId}` })
      .returning({ id: users.id });
    userAId = a.id;

    const [b] = await db
      .insert(users)
      .values({ email: bEmail, handle: `inboxb${runId}` })
      .returning({ id: users.id });
    userBId = b.id;

    const [c] = await db
      .insert(users)
      .values({ email: cEmail, handle: `inboxc${runId}` })
      .returning({ id: users.id });
    userCId = c.id;

    const [direct] = await db
      .insert(conversations)
      .values({ memberIds: [userAId, userBId], lastMessageAt: new Date(Date.now() - 5 * 60_000) })
      .returning({ id: conversations.id });
    directConversationId = direct.id;

    await db.insert(messages).values([
      {
        conversationId: directConversationId,
        senderId: userBId,
        body: "Old message, already read",
        createdAt: new Date(Date.now() - 60 * 60_000),
      },
      {
        conversationId: directConversationId,
        senderId: userBId,
        body: "New message, unread",
        createdAt: new Date(Date.now() - 5 * 60_000),
      },
    ]);

    // A last read the conversation 30 minutes ago -- only the newer
    // message from B should count as unread for A.
    await db
      .update(conversations)
      .set({ lastReadAt: { [userAId]: new Date(Date.now() - 30 * 60_000).toISOString() } })
      .where(eq(conversations.id, directConversationId));

    const [group] = await db
      .insert(conversations)
      .values({
        isGroup: true,
        memberIds: [userAId, userBId, userCId],
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60_000),
      })
      .returning({ id: conversations.id });
    groupConversationId = group.id;

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: userAId,
        game: `Helldivers ${runId}`,
        title: `Dive night ${runId}`,
        blurb: "Casual dives",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 3,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    await db.insert(applications).values([
      {
        postingId,
        applicantId: userBId,
        message: "Would love to join!",
        status: "pending",
        createdAt: new Date(Date.now() - 10 * 60_000),
      },
      {
        postingId,
        applicantId: userCId,
        message: "Already declined",
        status: "declined",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.postingId, postingId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(messages).where(eq(messages.conversationId, directConversationId));
    await db.delete(conversations).where(eq(conversations.id, directConversationId));
    await db.delete(conversations).where(eq(conversations.id, groupConversationId));
    await db.delete(users).where(eq(users.email, aEmail));
    await db.delete(users).where(eq(users.email, bEmail));
    await db.delete(users).where(eq(users.email, cEmail));
  });

  it("includes a real conversation with the other member's handle and unread count", async () => {
    const list = await getInboxList(userAId);
    const direct = list.find((item) => item.id === directConversationId);
    expect(direct).toBeDefined();
    expect(direct!.kind).toBe("conversation");
    expect(direct!.name).toBe(`@inboxb${runId}`);
    expect(direct!.preview).toBe("New message, unread");
    expect(direct!.unreadCount).toBe(1);
  });

  it("names a group conversation by its members when no name is set", async () => {
    const list = await getInboxList(userAId);
    const group = list.find((item) => item.id === groupConversationId);
    expect(group).toBeDefined();
    expect(group!.name).toContain(`@inboxb${runId}`);
    expect(group!.name).toContain(`@inboxc${runId}`);
  });

  it("includes a pending Application as a request item for the host", async () => {
    const list = await getInboxList(userAId);
    const request = list.find((item) => item.kind === "request");
    expect(request).toBeDefined();
    expect(request!.name).toBe(`@inboxb${runId}`);
    expect(request!.preview).toBe("Would love to join!");
    expect(request!.unreadCount).toBe(1);
  });

  it("excludes a declined Application from the list", async () => {
    const list = await getInboxList(userAId);
    expect(list.some((item) => item.name === `@inboxc${runId}` && item.kind === "request")).toBe(false);
  });

  it("sorts by most recent activity first", async () => {
    const list = await getInboxList(userAId);
    const timestamps = list.map((item) => item.lastActivityAt.getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("returns an empty list for a user with no conversations or requests", async () => {
    const list = await getInboxList("00000000-0000-0000-0000-000000000000");
    expect(list).toEqual([]);
  });

  // Public Profile (022): a host-initiated invite surfaces in the
  // INVITED applicant's own inbox, not the inviting host's.
  describe("host-initiated invites (022)", () => {
    let inviteId: string;

    beforeAll(async () => {
      const [invite] = await db
        .insert(applications)
        .values({ postingId, applicantId: userCId, status: "pending", initiatedBy: "host" })
        .returning({ id: applications.id });
      inviteId = invite.id;
    });

    afterAll(async () => {
      await db.delete(applications).where(eq(applications.id, inviteId));
    });

    it("surfaces the invite as a request item in the invited applicant's inbox, named after the host", async () => {
      const list = await getInboxList(userCId);
      const invite = list.find((item) => item.id === inviteId);
      expect(invite).toBeDefined();
      expect(invite!.kind).toBe("request");
      expect(invite!.name).toBe(`@inboxa${runId}`);
      expect(invite!.preview).toBe("Invited you to join their party.");
    });

    it("does NOT surface the invite as a request item in the inviting host's own inbox", async () => {
      const list = await getInboxList(userAId);
      expect(list.some((item) => item.id === inviteId)).toBe(false);
    });
  });
});
