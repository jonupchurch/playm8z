import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads, reports, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { reportForumContent } = await import("./report-forum-content");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `report-verified-${runId}@example.com`;
const unverifiedEmail = `report-unverified-${runId}@example.com`;

let reporterId: string;
let threadId: string;
let replyId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [reporter] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `reportverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  reporterId = reporter.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `reportunverified${runId}` });

  const [thread] = await db
    .insert(forumThreads)
    .values({ authorId: reporterId, categoryId: "general", title: `Thread ${runId}`, body: "body" })
    .returning({ id: forumThreads.id });
  threadId = thread.id;

  const [reply] = await db
    .insert(forumReplies)
    .values({ threadId, authorId: reporterId, body: "A reply" })
    .returning({ id: forumReplies.id });
  replyId = reply.id;
});

afterAll(async () => {
  await db.delete(reports).where(eq(reports.reporterId, reporterId));
  await db.delete(forumReplies).where(eq(forumReplies.threadId, threadId));
  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
});

describe("reportForumContent", () => {
  it("reports a reply, writing targetType='forum' into the shared reports table", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await reportForumContent({ targetId: replyId });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(reports).where(eq(reports.targetId, replyId));
    expect(row).toBeDefined();
    expect(row.targetType).toBe("forum");
    expect(row.reporterId).toBe(reporterId);
    expect(row.status).toBe("open");
  });

  it("reports the thread itself", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await reportForumContent({ targetId: threadId });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(reports).where(eq(reports.targetId, threadId));
    expect(row.targetType).toBe("forum");
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await reportForumContent({ targetId: replyId });
    expect(result.success).toBe(false);
  });
});
