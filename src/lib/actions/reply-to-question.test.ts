import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, questions, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { replyToQuestion } = await import("./reply-to-question");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `reply-host-${runId}@example.com`;
const otherEmail = `reply-other-${runId}@example.com`;
let postingId: string;
let questionId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `replyhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });

  await db.insert(users).values({
    email: otherEmail,
    handle: `replyother${runId}`,
    emailVerified: new Date(),
  });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: host.id,
      game: `Reply-${runId}`,
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

  const [question] = await db
    .insert(questions)
    .values({ postingId, askerId: host.id, text: "Is Sunday an option?" })
    .returning({ id: questions.id });
  questionId = question.id;
});

afterAll(async () => {
  await db.delete(questions).where(eq(questions.postingId, postingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, otherEmail));
});

describe("replyToQuestion", () => {
  it("rejects a non-host session replying to someone else's listing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await replyToQuestion(questionId, { reply: "Sure, Sunday works." });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(questions).where(eq(questions.id, questionId));
    expect(row.reply).toBeNull();
  });

  it("lets the listing's own host reply", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await replyToQuestion(questionId, { reply: "Sure, Sunday works." });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(questions).where(eq(questions.id, questionId));
    expect(row.reply).toBe("Sure, Sunday works.");
    expect(row.repliedAt).not.toBeNull();
  });

  it("rejects replying to a question that already has a reply", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await replyToQuestion(questionId, { reply: "Second reply attempt." });
    expect(result.success).toBe(false);
  });
});
