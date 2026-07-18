import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, blocks, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { applyToPosting } = await import("./apply-to-posting");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `apply-host-${runId}@example.com`;
const applicantEmail = `apply-applicant-${runId}@example.com`;
const unverifiedEmail = `apply-unverified-${runId}@example.com`;
const blockedEmail = `apply-blocked-${runId}@example.com`;
let hostId: string;
let blockedId: string;
let openPostingId: string;
let fullPostingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `applyhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  await db.insert(users).values([
    { email: applicantEmail, handle: `applyapplicant${runId}`, emailVerified: new Date() },
    { email: unverifiedEmail, handle: `applyunverified${runId}` },
  ]);

  const [blocked] = await db
    .insert(users)
    .values({ email: blockedEmail, handle: `applyblocked${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  blockedId = blocked.id;

  const base = {
    hostId,
    blurb: "b",
    title: "t",
    vibe: "fun",
    region: "na-east",
    ageGroup: "18",
    timeSlots: ["evening"],
    platform: "pc",
    micRequired: false,
    seatsTotal: 4,
    status: "open" as const,
  };

  const [open] = await db
    .insert(postings)
    .values({ ...base, game: `ApplyOpen-${runId}`, seatsOpen: 2 })
    .returning({ id: postings.id });
  openPostingId = open.id;

  const [full] = await db
    .insert(postings)
    .values({ ...base, game: `ApplyFull-${runId}`, seatsOpen: 0 })
    .returning({ id: postings.id });
  fullPostingId = full.id;
});

afterAll(async () => {
  await db.delete(applications).where(eq(applications.postingId, openPostingId));
  await db.delete(postings).where(eq(postings.id, openPostingId));
  await db.delete(postings).where(eq(postings.id, fullPostingId));
  await db.delete(applications).where(eq(applications.applicantId, blockedId));
  await db.delete(blocks).where(eq(blocks.blockerId, blockedId));
  await db.delete(blocks).where(eq(blocks.blockedId, blockedId));
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, applicantEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.email, blockedEmail));
});

async function applicationsByBlocked() {
  return db.select().from(applications).where(and(eq(applications.postingId, openPostingId), eq(applications.applicantId, blockedId)));
}

describe("applyToPosting", () => {
  it("creates a pending application for a verified, non-host applicant", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await applyToPosting(openPostingId, { message: "Let me in!" });
    expect(result.success).toBe(true);

    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, openPostingId));
    expect(row.status).toBe("pending");
    expect(row.message).toBe("Let me in!");
  });

  it("rejects a second active application from the same user to the same posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await applyToPosting(openPostingId, {});
    expect(result.success).toBe(false);

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, openPostingId));
    expect(rows).toHaveLength(1);
  });

  it("rejects the listing's own host applying to their own listing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await applyToPosting(fullPostingId, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/your own listing/i);
  });

  it("rejects applying to a listing with zero open spots", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await applyToPosting(fullPostingId, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no open spots/i);
  });

  it("blocks an unverified session and creates nothing", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await applyToPosting(fullPostingId, {});
    expect(result.success).toBe(false);

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, fullPostingId));
    expect(rows).toHaveLength(0);
  });

  // 045 (ADR 0017): block enforcement.
  it("refuses when the host has blocked the applicant, creating nothing (neutral message)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await applyToPosting(openPostingId, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/can't apply/i);
      expect(result.error).not.toMatch(/block/i);
    }
    expect(await applicationsByBlocked()).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("refuses in the opposite direction (applicant blocked the host)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: blockedId, blockedId: hostId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await applyToPosting(openPostingId, {});
    expect(result.success).toBe(false);
    expect(await applicationsByBlocked()).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("allows the application once the block is lifted (unblockedAt set)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId }).returning({ id: blocks.id });
    await db.update(blocks).set({ unblockedAt: new Date() }).where(eq(blocks.id, block.id));
    mockedAuth.mockResolvedValueOnce(fakeSession(blockedEmail));
    const result = await applyToPosting(openPostingId, {});
    expect(result.success).toBe(true);
    expect(await applicationsByBlocked()).toHaveLength(1);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });
});
