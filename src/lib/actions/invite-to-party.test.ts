import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, blocks, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { inviteToParty } = await import("./invite-to-party");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `invite-host-${runId}@example.com`;
const unverifiedEmail = `invite-unverified-${runId}@example.com`;
const otherHostEmail = `invite-otherhost-${runId}@example.com`;
const blockedInviteeEmail = `invite-blocked-${runId}@example.com`;

let hostId: string;
let otherHostId: string;
let invitedUserId: string;
let blockedInviteeId: string;
let openPostingId: string;
let fullPostingId: string;
let otherHostPostingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `invitehost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;

  const [otherHost] = await db
    .insert(users)
    .values({ email: otherHostEmail, handle: `inviteotherhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  otherHostId = otherHost.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `inviteunverified${runId}` });

  const [invited] = await db
    .insert(users)
    .values({ email: `invite-invited-${runId}@example.com`, handle: `inviteinvited${runId}` })
    .returning({ id: users.id });
  invitedUserId = invited.id;

  const [blockedInvitee] = await db
    .insert(users)
    .values({ email: blockedInviteeEmail, handle: `inviteblocked${runId}` })
    .returning({ id: users.id });
  blockedInviteeId = blockedInvitee.id;

  const postingDefaults = {
    game: "Valorant",
    title: "Party",
    blurb: "blurb",
    vibe: "casual",
    region: "na-west",
    ageGroup: "18" as const,
    timeSlots: ["evening"],
    platform: "pc",
  };

  const [openPosting] = await db
    .insert(postings)
    .values({ ...postingDefaults, hostId, seatsTotal: 4, seatsOpen: 2, status: "open" })
    .returning({ id: postings.id });
  openPostingId = openPosting.id;

  const [fullPosting] = await db
    .insert(postings)
    .values({ ...postingDefaults, hostId, seatsTotal: 4, seatsOpen: 0, status: "full" })
    .returning({ id: postings.id });
  fullPostingId = fullPosting.id;

  const [otherHostPosting] = await db
    .insert(postings)
    .values({ ...postingDefaults, hostId: otherHostId, seatsTotal: 4, seatsOpen: 2, status: "open" })
    .returning({ id: postings.id });
  otherHostPostingId = otherHostPosting.id;
});

afterAll(async () => {
  await db.delete(applications).where(eq(applications.postingId, openPostingId));
  await db.delete(blocks).where(eq(blocks.blockerId, blockedInviteeId));
  await db.delete(blocks).where(eq(blocks.blockedId, blockedInviteeId));
  await db.delete(postings).where(eq(postings.id, openPostingId));
  await db.delete(postings).where(eq(postings.id, fullPostingId));
  await db.delete(postings).where(eq(postings.id, otherHostPostingId));
  await db.delete(users).where(eq(users.id, hostId));
  await db.delete(users).where(eq(users.id, otherHostId));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.id, invitedUserId));
  await db.delete(users).where(eq(users.id, blockedInviteeId));
});

async function invitesForBlocked() {
  return db.select().from(applications).where(and(eq(applications.postingId, openPostingId), eq(applications.applicantId, blockedInviteeId)));
}

describe("inviteToParty", () => {
  it("creates a pending, host-initiated application", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId });
    expect(result).toEqual({ success: true });

    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.postingId, openPostingId));
    expect(application.applicantId).toBe(invitedUserId);
    expect(application.status).toBe("pending");
    expect(application.initiatedBy).toBe("host");
  });

  it("rejects a duplicate active invite to the same posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId });
    expect(result.success).toBe(false);
  });

  it("rejects when the acting user doesn't host the posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: otherHostPostingId, invitedUserId });
    expect(result.success).toBe(false);
  });

  it("rejects a posting with no open seats", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: fullPostingId, invitedUserId });
    expect(result.success).toBe(false);
  });

  it("rejects inviting yourself", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId: hostId });
    expect(result.success).toBe(false);
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId });
    expect(result.success).toBe(false);
  });

  it("blocks an unauthenticated visitor", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId });
    expect(result.success).toBe(false);
  });

  // 045 (ADR 0017): block enforcement.
  it("refuses when the host has blocked the invitee, creating nothing (neutral message)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId: blockedInviteeId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId: blockedInviteeId });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/can't invite/i);
      expect(result.error).not.toMatch(/block/i);
    }
    expect(await invitesForBlocked()).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("refuses in the opposite direction (invitee blocked the host)", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: blockedInviteeId, blockedId: hostId }).returning({ id: blocks.id });
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId: blockedInviteeId });
    expect(result.success).toBe(false);
    expect(await invitesForBlocked()).toHaveLength(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });

  it("allows the invite once the block is lifted", async () => {
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId: blockedInviteeId }).returning({ id: blocks.id });
    await db.update(blocks).set({ unblockedAt: new Date() }).where(eq(blocks.id, block.id));
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await inviteToParty({ postingId: openPostingId, invitedUserId: blockedInviteeId });
    expect(result).toEqual({ success: true });
    expect(await invitesForBlocked()).toHaveLength(1);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });
});
