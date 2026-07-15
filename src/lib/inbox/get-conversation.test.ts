import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";
import { getConversationOrRequest, markConversationRead } from "./get-conversation";

describe("getConversationOrRequest (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const aEmail = `get-convo-a-${runId}@example.com`;
  const bEmail = `get-convo-b-${runId}@example.com`;
  const outsiderEmail = `get-convo-outsider-${runId}@example.com`;

  let userAId: string;
  let userBId: string;
  let outsiderId: string;
  let directConversationId: string;
  let postingId: string;
  let applicationId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ email: aEmail, handle: `getconvoa${runId}` })
      .returning({ id: users.id });
    userAId = a.id;

    const [b] = await db
      .insert(users)
      .values({ email: bEmail, handle: `getconvob${runId}` })
      .returning({ id: users.id });
    userBId = b.id;

    const [outsider] = await db
      .insert(users)
      .values({ email: outsiderEmail, handle: `getconvooutsider${runId}` })
      .returning({ id: users.id });
    outsiderId = outsider.id;

    const [conversation] = await db
      .insert(conversations)
      .values({ memberIds: [userAId, userBId] })
      .returning({ id: conversations.id });
    directConversationId = conversation.id;

    await db.insert(messages).values({ conversationId: directConversationId, senderId: userBId, body: "Hi there" });

    const [posting] = await db
      .insert(postings)
      .values({
        hostId: userAId,
        game: `Game ${runId}`,
        title: `Posting ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 2,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    postingId = posting.id;

    const [application] = await db
      .insert(applications)
      .values({ postingId, applicantId: userBId, message: "Let me join", status: "pending" })
      .returning({ id: applications.id });
    applicationId = application.id;
  });

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.postingId, postingId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(messages).where(eq(messages.conversationId, directConversationId));
    await db.delete(conversations).where(eq(conversations.id, directConversationId));
    await db.delete(users).where(eq(users.email, aEmail));
    await db.delete(users).where(eq(users.email, bEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("returns a conversation view with the other member's handle and message history", async () => {
    const result = await getConversationOrRequest(directConversationId, userAId);
    expect(result?.kind).toBe("conversation");
    if (result?.kind !== "conversation") return;
    expect(result.name).toBe(`@getconvob${runId}`);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].body).toBe("Hi there");
  });

  it("excludes a message removed via Admin Reports (019) from the conversation view", async () => {
    const [removedMessage] = await db
      .insert(messages)
      .values({ conversationId: directConversationId, senderId: userBId, body: "spam dm", removedAt: new Date() })
      .returning({ id: messages.id });

    const result = await getConversationOrRequest(directConversationId, userAId);
    if (result?.kind !== "conversation") throw new Error("expected a conversation view");
    expect(result.messages.map((m) => m.id)).not.toContain(removedMessage.id);
    expect(result.messages).toHaveLength(1); // the untouched earlier message still shows

    await db.delete(messages).where(eq(messages.id, removedMessage.id));
  });

  it("returns null for a conversation the viewer isn't a member of", async () => {
    const result = await getConversationOrRequest(directConversationId, outsiderId);
    expect(result).toBeNull();
  });

  it("returns a request view for the posting's host", async () => {
    const result = await getConversationOrRequest(applicationId, userAId);
    expect(result?.kind).toBe("request");
    if (result?.kind !== "request") return;
    expect(result.applicantHandle).toBe(`getconvob${runId}`);
    expect(result.message).toBe("Let me join");
  });

  it("returns null for a request viewed by someone other than the host", async () => {
    const result = await getConversationOrRequest(applicationId, outsiderId);
    expect(result).toBeNull();
  });

  it("returns null for a request that's no longer pending", async () => {
    await db.update(applications).set({ status: "declined" }).where(eq(applications.id, applicationId));
    const result = await getConversationOrRequest(applicationId, userAId);
    expect(result).toBeNull();
    await db.update(applications).set({ status: "pending" }).where(eq(applications.id, applicationId));
  });

  it("returns null for an id that matches neither a conversation nor an application", async () => {
    const result = await getConversationOrRequest("00000000-0000-0000-0000-000000000000", userAId);
    expect(result).toBeNull();
  });

  it("markConversationRead sets the viewer's own lastReadAt", async () => {
    await markConversationRead(directConversationId, userAId);
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, directConversationId));
    expect(conversation.lastReadAt[userAId]).toBeDefined();
  });
});
