import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, questions, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { askQuestion } = await import("./ask-question");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const askerEmail = `ask-verified-${runId}@example.com`;
const unverifiedEmail = `ask-unverified-${runId}@example.com`;
let postingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: `ask-host-${runId}@example.com`, handle: `askhost${runId}` })
    .returning({ id: users.id });

  await db.insert(users).values([
    { email: askerEmail, handle: `askverified${runId}`, emailVerified: new Date() },
    { email: unverifiedEmail, handle: `askunverified${runId}` },
  ]);

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
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, askerEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.handle, `askhost${runId}`));
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
});
