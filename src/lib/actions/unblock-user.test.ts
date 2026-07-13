import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { unblockUser } = await import("./unblock-user");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const blockerEmail = `unblock-blocker-${runId}@example.com`;
const otherEmail = `unblock-other-${runId}@example.com`;
let blockedTargetId: string;
let activeBlockId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [blocker] = await db
    .insert(users)
    .values({ email: blockerEmail, handle: `unblockblocker${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });

  await db.insert(users).values({ email: otherEmail, handle: `unblockother${runId}`, emailVerified: new Date() });

  const [target] = await db
    .insert(users)
    .values({ email: `unblock-target-${runId}@example.com`, handle: `unblocktarget${runId}` })
    .returning({ id: users.id });
  blockedTargetId = target.id;

  const [block] = await db
    .insert(blocks)
    .values({ blockerId: blocker.id, blockedId: blockedTargetId })
    .returning({ id: blocks.id });
  activeBlockId = block.id;
});

afterAll(async () => {
  await db.delete(blocks).where(eq(blocks.blockedId, blockedTargetId));
  await db.delete(users).where(eq(users.email, blockerEmail));
  await db.delete(users).where(eq(users.email, otherEmail));
  await db.delete(users).where(eq(users.id, blockedTargetId));
});

describe("unblockUser", () => {
  it("rejects a user who isn't the original blocker", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await unblockUser(activeBlockId);
    expect(result.success).toBe(false);

    const [row] = await db.select().from(blocks).where(eq(blocks.id, activeBlockId));
    expect(row.unblockedAt).toBeNull();
  });

  it("sets unblockedAt for the original blocker", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await unblockUser(activeBlockId);
    expect(result.success).toBe(true);

    const [row] = await db.select().from(blocks).where(eq(blocks.id, activeBlockId));
    expect(row.unblockedAt).not.toBeNull();
  });

  it("rejects unblocking an already-unblocked row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(blockerEmail));
    const result = await unblockUser(activeBlockId);
    expect(result.success).toBe(false);
  });

  it("blocks an unverified session", async () => {
    const [unverified] = await db
      .insert(users)
      .values({ email: `unblock-unverified-${runId}@example.com`, handle: `unblockunverified${runId}` })
      .returning({ id: users.id });
    const [otherBlock] = await db
      .insert(blocks)
      .values({ blockerId: unverified.id, blockedId: blockedTargetId })
      .returning({ id: blocks.id });

    mockedAuth.mockResolvedValueOnce({
      user: { email: `unblock-unverified-${runId}@example.com` },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });
    const result = await unblockUser(otherBlock.id);
    expect(result.success).toBe(false);

    await db.delete(blocks).where(eq(blocks.id, otherBlock.id));
    await db.delete(users).where(eq(users.id, unverified.id));
  });
});
