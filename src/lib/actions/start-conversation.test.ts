import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, conversations, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { startConversation } = await import("./start-conversation");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("startConversation (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const starterEmail = `start-convo-a-${runId}@example.com`;
  const bEmail = `start-convo-b-${runId}@example.com`;
  const cEmail = `start-convo-c-${runId}@example.com`;
  const blockerEmail = `start-convo-blocker-${runId}@example.com`;

  let starterId: string;
  let bId: string;
  let cId: string;
  let blockerId: string;
  const createdConversationIds: string[] = [];

  beforeAll(async () => {
    const [starter] = await db
      .insert(users)
      .values({ email: starterEmail, handle: `startconvoa${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    starterId = starter.id;

    const [b] = await db
      .insert(users)
      .values({ email: bEmail, handle: `startconvob${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    bId = b.id;

    const [c] = await db
      .insert(users)
      .values({ email: cEmail, handle: `startconvoc${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    cId = c.id;

    const [blocker] = await db
      .insert(users)
      .values({ email: blockerEmail, handle: `startconvoblocker${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    blockerId = blocker.id;

    // blocker has blocked the starter -- reverse-direction block, must
    // still be rejected server-side (edge case in spec.md).
    await db.insert(blocks).values({ blockerId, blockedId: starterId });
  });

  afterAll(async () => {
    await db.delete(blocks).where(eq(blocks.blockerId, blockerId));
    for (const id of createdConversationIds) {
      await db.delete(conversations).where(eq(conversations.id, id));
    }
    await db.delete(users).where(eq(users.email, starterEmail));
    await db.delete(users).where(eq(users.email, bEmail));
    await db.delete(users).where(eq(users.email, cEmail));
    await db.delete(users).where(eq(users.email, blockerEmail));
  });

  it("creates a new direct conversation for a single recipient", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));

    const result = await startConversation({ recipientIds: [bId] });
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdConversationIds.push(result.conversationId);

    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, result.conversationId));
    expect(conversation.isGroup).toBe(false);
    expect(conversation.memberIds.sort()).toEqual([starterId, bId].sort());
  });

  it("reuses the existing direct conversation rather than duplicating it", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));
    const first = await startConversation({ recipientIds: [bId] });
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));
    const second = await startConversation({ recipientIds: [bId] });

    expect(first.success && second.success && first.conversationId === second.conversationId).toBe(true);
  });

  it("creates a group conversation for two or more recipients", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));

    const result = await startConversation({ recipientIds: [bId, cId], groupName: "Party" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdConversationIds.push(result.conversationId);

    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, result.conversationId));
    expect(conversation.isGroup).toBe(true);
    expect(conversation.name).toBe("Party");
    expect(conversation.memberIds.sort()).toEqual([starterId, bId, cId].sort());
  });

  it("rejects starting a conversation with someone who has blocked the starter, even bypassing the UI", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));

    const result = await startConversation({ recipientIds: [blockerId] });
    expect(result).toEqual({ success: false, error: "You can't message this person." });
  });

  it("rejects an empty recipient list", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(starterEmail));

    const result = await startConversation({ recipientIds: [] });
    expect(result.success).toBe(false);
  });
});
