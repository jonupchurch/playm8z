import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, postings, questions, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { askQuestion } = await import("./ask-question");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `ask-host-${runId}@example.com`;
const askerEmail = `ask-verified-${runId}@example.com`;
const unverifiedEmail = `ask-unverified-${runId}@example.com`;
const blockedEmail = `ask-blocked-${runId}@example.com`;
let hostId: string;
let blockedId: string;
let postingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `askhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  await db.insert(users).values([
    { email: askerEmail, handle: `askverified${runId}`, emailVerified: new Date() },
    { email: unverifiedEmail, handle: `askunverified${runId}` },
  ]);

  const [blocked] = await db
    .insert(users)
    .values({ email: blockedEmail, handle: `askblocked${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  blockedId = blocked.id;

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: host.id,
      game: `Ask-${runId}`,
      title: "t",
      blurb: "b",
      vibe: "fun",
      region: "na-east",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      micRequired: false,
      seatsTotal: 4,
      seatsOpen: 2,
      status: "open",
    })
    .returning({ id: postings.id });
  postingId = posting.id;
});

afterAll(async () => {
  await db.delete(questions).where(eq(questions.postingId, postingId));
  await db.delete(blocks).where(eq(blocks.blockerId, blockedId));
  await db.delete(blocks).where(eq(blocks.blockedId, blockedId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, askerEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.email, blockedEmail));
  await db.delete(users).where(eq(users.email, hostEmail));
});

describe("askQuestion", () => {
  it("creates a question for a verified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(askerEmail));
    const result = await askQuestion(postingId, { text: "What rank are the current members?" });
    expect(result.success).toBe(true);

    const rows = await db.select().from(questions).where(eq(questions.postingId, postingId));
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("What rank are the current members?");
    expect(rows[0].reply).toBeNull();
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await askQuestion(postingId, { text: "Another question" });
    expect(result.success).toBe(false);

    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.text, "Another question"));
    expect(rows).toHaveLength(0);
  });

  it("rejects an empty question", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(askerEmail));
    const result = await askQuestion(postingId, { text: "   " });
    expect(result.success).toBe(false);
  });

  it("refuses a question on a listing that no longer exists", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(askerEmail));
    const result = await askQuestion(crypto.randomUUID(), { text: "Ghost listing" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no longer exists/i);
  });

  // 045 (ADR 0017): block enforcement.
  it("lets the host ask a question on their own listing (self is never blocked)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await askQuestion(postingId, { text: "Host self-question" });
    expect(result.success).toBe(true);
  });

  it("refuses when the host has blocked the asker, creating nothing (neutral message)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await askQuestion(postingId, { text: "Blocked question A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/can't ask/i);
      expect(result.error).not.toMatch(/block/i);
    }
    expect(await db.select().from(questions).where(eq(questions.text, "Blocked question A"))).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("refuses in the opposite direction (asker blocked the host)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: blockedId, blockedId: hostId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await askQuestion(postingId, { text: "Blocked question B" });
    expect(result.success).toBe(false);
    expect(await db.select().from(questions).where(eq(questions.text, "Blocked question B"))).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("allows the question once the block is lifted", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId }).returning({ id: blocks.id });
    await db.update(blocks).set({ unblockedAt: new Date() }).where(eq(blocks.id, block.id));
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await askQuestion(postingId, { text: "Unblocked question" });
    expect(result.success).toBe(true);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });
});
