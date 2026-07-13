import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { blockUser } = await import("./block-user");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const blockerEmail = `block-blocker-${runId}@example.com`;
const unverifiedEmail = `block-unverified-${runId}@example.com`;
let blockerId: string;
let targetAId: string;
let targetBId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [blocker] = await db
    .insert(users)
    .values({ email: blockerEmail, handle: `blockblocker${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  blockerId = blocker.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `blockunverified${runId}` });

  const [targetA] = await db
    .insert(users)
    .values({ email: `block-target-a-${runId}@example.com`, handle: `blocktargeta${runId}` })
    .returning({ id: users.id });
  targetAId = targetA.id;

  const [targetB] = await db
    .insert(users)
    .values({ email: `block-target-b-${runId}@example.com`, handle: `blocktargetb${runId}` })
    .returning({ id: users.id });
  targetBId = targetB.id;
});

afterAll(async () => {
  await db.delete(reports).where(eq(reports.reporterId, blockerId));
  await db.delete(blocks).where(eq(blocks.blockerId, blockerId));
  await db.delete(users).where(eq(users.email, blockerEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.id, targetAId));
  await db.delete(users).where(eq(users.id, targetBId));
});

describe("blockUser", () => {
  it("creates a block with no report by default", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await blockUser({ blockedId: targetAId });
    expect(result.success).toBe(true);

    const [row] = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, targetAId)));
    expect(row).toBeDefined();
    expect(row.unblockedAt).toBeNull();

    const reportRows = await db.select().from(reports).where(eq(reports.targetId, targetAId));
    expect(reportRows).toHaveLength(0);
  });

  it("rejects a duplicate active block against the same target", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await blockUser({ blockedId: targetAId });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/already blocked/i);
  });

  it("rejects blocking oneself", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await blockUser({ blockedId: blockerId });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/yourself/i);
  });

  it("creates exactly one report row when alsoReport is checked", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await blockUser({ blockedId: targetBId, alsoReport: true });
    expect(result.success).toBe(true);

    const reportRows = await db.select().from(reports).where(eq(reports.targetId, targetBId));
    expect(reportRows).toHaveLength(1);
    expect(reportRows[0].targetType).toBe("user");
    expect(reportRows[0].reporterId).toBe(blockerId);
    expect(reportRows[0].status).toBe("open");
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await blockUser({ blockedId: targetAId });
    expect(result.success).toBe(false);

    const rows = await db.select().from(blocks).where(eq(blocks.blockedId, targetAId));
    expect(rows).toHaveLength(1); // only the earlier, already-created block
  });
});
