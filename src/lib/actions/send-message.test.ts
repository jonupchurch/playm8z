import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { sendMessage } = await import("./send-message");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("sendMessage (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const senderEmail = `send-msg-sender-${runId}@example.com`;
  const otherEmail = `send-msg-other-${runId}@example.com`;
  const outsiderEmail = `send-msg-outsider-${runId}@example.com`;

  let senderId: string;
  let otherId: string;
  let conversationId: string;

  beforeAll(async () => {
    const [sender] = await db
      .insert(users)
      .values({ email: senderEmail, handle: `sendmsgsender${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    senderId = sender.id;

    const [other] = await db
      .insert(users)
      .values({ email: otherEmail, handle: `sendmsgother${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    otherId = other.id;

    await db
      .insert(users)
      .values({ email: outsiderEmail, handle: `sendmsgoutsider${runId}`, emailVerified: new Date() });

    const [conversation] = await db
      .insert(conversations)
      .values({ memberIds: [senderId, otherId] })
      .returning({ id: conversations.id });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(users).where(eq(users.email, senderEmail));
    await db.delete(users).where(eq(users.email, otherEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("creates a message and updates lastMessageAt and the sender's own lastReadAt", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(senderEmail));

    const result = await sendMessage({ conversationId, body: "Hello there" });
    expect(result).toEqual({ success: true });

    const [row] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    expect(row.body).toBe("Hello there");
    expect(row.senderId).toBe(senderId);

    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    expect(conversation.lastReadAt[senderId]).toBeDefined();
  });

  it("rejects a sender who isn't a member of the conversation", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(outsiderEmail));

    const result = await sendMessage({ conversationId, body: "Sneaky message" });
    expect(result).toEqual({ success: false, error: "This conversation wasn't found." });
  });

  it("rejects an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const result = await sendMessage({ conversationId, body: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty body", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(senderEmail));

    const result = await sendMessage({ conversationId, body: "" });
    expect(result.success).toBe(false);
  });
});
