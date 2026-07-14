import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { submitReport } = await import("./submit-report");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("submitReport (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const reporterEmail = `report-reporter-${runId}@example.com`;
  const unverifiedEmail = `report-unverified-${runId}@example.com`;
  const targetUserEmail = `report-target-${runId}@example.com`;

  let reporterId: string;
  let targetUserId: string;
  const postingTargetId = crypto.randomUUID();

  beforeAll(async () => {
    const [reporter] = await db
      .insert(users)
      .values({ email: reporterEmail, handle: `reportreporter${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    reporterId = reporter.id;

    await db.insert(users).values({ email: unverifiedEmail, handle: `reportunverified${runId}` });

    const [target] = await db
      .insert(users)
      .values({ email: targetUserEmail, handle: `reporttarget${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    targetUserId = target.id;
  });

  afterAll(async () => {
    await db.delete(reports).where(eq(reports.reporterId, reporterId));
    await db.delete(blocks).where(eq(blocks.blockerId, reporterId));
    await db.delete(users).where(eq(users.email, reporterEmail));
    await db.delete(users).where(eq(users.email, unverifiedEmail));
    await db.delete(users).where(eq(users.email, targetUserEmail));
  });

  it("creates a reports row with the chosen reason and details, no block", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(reporterEmail));
    const result = await submitReport({
      targetType: "posting",
      targetId: postingTargetId,
      reason: "spam",
      details: "Fake giveaway link in the blurb.",
    });
    expect(result).toEqual({ success: true, alsoBlocked: false });

    const [row] = await db.select().from(reports).where(eq(reports.targetId, postingTargetId));
    expect(row.reason).toBe("spam");
    expect(row.details).toBe("Fake giveaway link in the blurb.");
    expect(row.targetType).toBe("posting");
  });

  it("also creates a block when alsoBlock is checked and the target itself is the blockUserId", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(reporterEmail));
    const result = await submitReport({
      targetType: "user",
      targetId: targetUserId,
      reason: "harassment",
      alsoBlock: true,
      blockUserId: targetUserId,
    });
    expect(result).toEqual({ success: true, alsoBlocked: true });

    const [reportRow] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.reporterId, reporterId), eq(reports.targetId, targetUserId)));
    expect(reportRow.reason).toBe("harassment");

    const [blockRow] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, reporterId), eq(blocks.blockedId, targetUserId), isNull(blocks.unblockedAt)));
    expect(blockRow).toBeDefined();
  });

  it("blocks a different person than the reported target (e.g. reporting a posting, blocking its host)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(reporterEmail));
    const result = await submitReport({
      targetType: "posting",
      targetId: postingTargetId,
      reason: "inappropriate",
      alsoBlock: true,
      blockUserId: targetUserId,
    });
    expect(result).toEqual({ success: true, alsoBlocked: true });

    const [blockRow] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, reporterId), eq(blocks.blockedId, targetUserId), isNull(blocks.unblockedAt)));
    expect(blockRow).toBeDefined();
  });

  it("ignores alsoBlock when no blockUserId is supplied (nothing to block)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(reporterEmail));
    const forumTargetId = crypto.randomUUID();
    const result = await submitReport({
      targetType: "forum",
      targetId: forumTargetId,
      reason: "other",
      alsoBlock: true,
    });
    expect(result).toEqual({ success: true, alsoBlocked: false });
  });

  it("rejects reporting yourself", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(reporterEmail));
    const result = await submitReport({ targetType: "user", targetId: reporterId, reason: "spam" });
    expect(result).toEqual({ success: false, error: "You can't report yourself." });
  });

  it("blocks an unverified session with a verify-your-email message", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await submitReport({ targetType: "posting", targetId: postingTargetId, reason: "spam" });
    expect(result.success).toBe(false);
    expect(!result.success && result.error).toMatch(/verify your email/i);
  });

  it("rejects an unauthenticated attempt", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await submitReport({ targetType: "posting", targetId: postingTargetId, reason: "spam" });
    expect(result).toEqual({ success: false, error: "You must be logged in to report this." });
  });
});
