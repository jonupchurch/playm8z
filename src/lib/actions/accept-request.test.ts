import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, blocks, conversations, messages, notifications, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { acceptRequest } = await import("./accept-request");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("acceptRequest (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const hostEmail = `accept-host-${runId}@example.com`;
  const applicantEmail = `accept-applicant-${runId}@example.com`;
  const outsiderEmail = `accept-outsider-${runId}@example.com`;

  let hostId: string;
  let applicantId: string;
  const createdConversationIds: string[] = [];

  async function seedPendingApplication() {
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Game ${runId}`,
        title: `Posting ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 1,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    const [application] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId, message: "Let me in", status: "pending" })
      .returning({ id: applications.id });
    return { postingId: posting.id, applicationId: application.id };
  }

  beforeEach(async () => {
    if (!hostId) {
      const [host] = await db
        .insert(users)
        .values({ email: hostEmail, handle: `accepthost${runId}`, emailVerified: new Date() })
        .returning({ id: users.id });
      hostId = host.id;

      const [applicant] = await db
        .insert(users)
        .values({ email: applicantEmail, handle: `acceptapplicant${runId}`, emailVerified: new Date() })
        .returning({ id: users.id });
      applicantId = applicant.id;

      await db
        .insert(users)
        .values({ email: outsiderEmail, handle: `acceptoutsider${runId}`, emailVerified: new Date() });
    }
  });

  afterAll(async () => {
    for (const id of createdConversationIds) {
      await db.delete(messages).where(eq(messages.conversationId, id));
      await db.delete(conversations).where(eq(conversations.id, id));
    }
    await db.delete(applications).where(eq(applications.applicantId, applicantId));
    await db.delete(blocks).where(eq(blocks.blockerId, hostId));
    await db.delete(blocks).where(eq(blocks.blockedId, hostId));
    await db.delete(postings).where(eq(postings.hostId, hostId));
    await db.delete(users).where(eq(users.email, hostEmail));
    await db.delete(users).where(eq(users.email, applicantEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("accepts: sets status accepted, decrements seatsOpen, creates a conversation with a system message", async () => {
    const seeded = await seedPendingApplication();
    const before = Date.now();
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdConversationIds.push(result.conversationId);

    const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
    expect(application.status).toBe("accepted");
    // Landing page (026): acceptedAt now set alongside status, backing
    // that feature's "parties formed this week" stat.
    expect(application.acceptedAt).not.toBeNull();
    expect(application.acceptedAt!.getTime()).toBeGreaterThanOrEqual(before);

    const [posting] = await db.select().from(postings).where(eq(postings.id, seeded.postingId));
    expect(posting.seatsOpen).toBe(0);
    expect(posting.status).toBe("full");

    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, result.conversationId));
    expect(conversation.memberIds.sort()).toEqual([hostId, applicantId].sort());

    const [message] = await db.select().from(messages).where(eq(messages.conversationId, result.conversationId));
    expect(message.type).toBe("system");
    expect(message.senderId).toBeNull();
  });

  it("does not flip the posting to full when seats remain open", async () => {
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Game ${runId}`,
        title: `Posting roomy ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 3,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    const [application] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId, message: "Let me in", status: "pending" })
      .returning({ id: applications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await acceptRequest({ applicationId: application.id });
    expect(result.success).toBe(true);
    if (result.success) createdConversationIds.push(result.conversationId);

    const [updatedPosting] = await db.select().from(postings).where(eq(postings.id, posting.id));
    expect(updatedPosting.seatsOpen).toBe(2);
    expect(updatedPosting.status).toBe("open");
  });

  it("rejects someone other than the posting's host", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(outsiderEmail));

    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result).toEqual({ success: false, error: "You can't accept this request." });

    const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
    expect(application.status).toBe("pending");
  });

  it("rejects an already-accepted or declined application", async () => {
    const seeded = await seedPendingApplication();
    await db.update(applications).set({ status: "declined" }).where(eq(applications.id, seeded.applicationId));

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result).toEqual({ success: false, error: "This request is no longer pending." });
  });

  it("under a concurrent double-accept, exactly one wins and seatsOpen decrements exactly once", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const [first, second] = await Promise.all([
      acceptRequest({ applicationId: seeded.applicationId }),
      acceptRequest({ applicationId: seeded.applicationId }),
    ]);

    const results = [first, second];
    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (failed[0] && !failed[0].success) {
      expect(failed[0].error).toBe("This request is no longer pending.");
    }
    if (succeeded[0]?.success) createdConversationIds.push(succeeded[0].conversationId);

    const [posting] = await db.select().from(postings).where(eq(postings.id, seeded.postingId));
    expect(posting.seatsOpen).toBe(0);
  });

  // Regression guard for the FOR UPDATE lock on the posting row: two
  // DIFFERENT pending applications accepted concurrently must each
  // decrement seatsOpen exactly once. The pre-fix read-modify-write left
  // it decremented only once (a lost update) -- the party looked like it
  // had an extra open seat, so it could be overbooked.
  it("under concurrent accepts of two different applications, seatsOpen decrements exactly once per accept", async () => {
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Game ${runId}`,
        title: `Posting seat-race ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 3,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });

    // Feature 046's partial unique index forbids two active applications
    // from the SAME applicant on one posting, so the race needs two people.
    const [applicant2] = await db
      .insert(users)
      .values({ email: `accept-applicant2-${runId}@example.com`, handle: `acceptapplicant2${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });

    const [app1] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId, message: "me", status: "pending" })
      .returning({ id: applications.id });
    const [app2] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId: applicant2.id, message: "me too", status: "pending" })
      .returning({ id: applications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const [r1, r2] = await Promise.all([
      acceptRequest({ applicationId: app1.id }),
      acceptRequest({ applicationId: app2.id }),
    ]);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (r1.success) createdConversationIds.push(r1.conversationId);
    if (r2.success) createdConversationIds.push(r2.conversationId);

    // Both accepts committed, so both decrements must land: 3 -> 1.
    const [updated] = await db.select().from(postings).where(eq(postings.id, posting.id));
    expect(updated.seatsOpen).toBe(1);

    await db.delete(applications).where(eq(applications.applicantId, applicant2.id));
    await db.delete(users).where(eq(users.id, applicant2.id));
  });

  // Public Profile (022): a host-initiated invite reverses who's
  // authorized -- the INVITED applicant, not the inviting host.
  it("for a host-initiated invite, the invited applicant (not the host) may accept", async () => {
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Game ${runId}`,
        title: `Invite posting ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 1,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    const [invite] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId, status: "pending", initiatedBy: "host" })
      .returning({ id: applications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const hostAttempt = await acceptRequest({ applicationId: invite.id });
    expect(hostAttempt).toEqual({ success: false, error: "You can't accept this request." });

    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const invitedAttempt = await acceptRequest({ applicationId: invite.id });
    expect(invitedAttempt.success).toBe(true);
    if (invitedAttempt.success) createdConversationIds.push(invitedAttempt.conversationId);

    const [application] = await db.select().from(applications).where(eq(applications.id, invite.id));
    expect(application.status).toBe("accepted");

    const [updatedPosting] = await db.select().from(postings).where(eq(postings.id, posting.id));
    expect(updatedPosting.seatsOpen).toBe(0);
  });

  it("notifies the applicant with an accepted notification linking to the listing (040)", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdConversationIds.push(result.conversationId);

    const rows = await db.select().from(notifications).where(eq(notifications.userId, applicantId));
    const accepted = rows.filter((r) => r.targetRef === `/listing/${seeded.postingId}` && r.type === "accepted");
    expect(accepted).toHaveLength(1);
    expect(accepted[0].actorId).toBe(hostId);
  });

  it("a host-initiated invite accepted by the applicant notifies no one (040)", async () => {
    const [posting] = await db
      .insert(postings)
      .values({
        hostId,
        game: `Game ${runId}`,
        title: `Invite notify ${runId}`,
        blurb: "blurb",
        vibe: "casual",
        region: "na-east",
        seatsTotal: 4,
        seatsOpen: 1,
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
      })
      .returning({ id: postings.id });
    const [invite] = await db
      .insert(applications)
      .values({ postingId: posting.id, applicantId, status: "pending", initiatedBy: "host" })
      .returning({ id: applications.id });

    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await acceptRequest({ applicationId: invite.id });
    expect(result.success).toBe(true);
    if (result.success) createdConversationIds.push(result.conversationId);

    // The applicant is the actor here; the host's side is the synthesized view.
    const rows = await db.select().from(notifications).where(eq(notifications.userId, applicantId));
    expect(rows.filter((r) => r.targetRef === `/listing/${posting.id}`)).toHaveLength(0);
  });

  // 045 (ADR 0017): block enforcement -- an accept that would put a blocked pair on a
  // roster is refused atomically (seats/status unchanged), in either block direction.
  it("refuses the accept under a block, leaving seats and status unchanged (both directions)", async () => {
    const seeded = await seedPendingApplication();

    for (const [blockerId, blockedId] of [
      [hostId, applicantId],
      [applicantId, hostId],
    ]) {
      const [block] = await db.insert(blocks).values({ blockerId, blockedId }).returning({ id: blocks.id });
      mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
      const result = await acceptRequest({ applicationId: seeded.applicationId });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/can't accept/i);
        expect(result.error).not.toMatch(/block/i);
      }

      const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
      expect(application.status).toBe("pending");
      const [posting] = await db.select().from(postings).where(eq(postings.id, seeded.postingId));
      expect(posting.seatsOpen).toBe(1);
      expect(posting.status).not.toBe("full");

      await db.delete(blocks).where(eq(blocks.id, block.id));
    }
  });

  it("allows the accept once the block is lifted, decrementing seats", async () => {
    const seeded = await seedPendingApplication();
    const [block] = await db.insert(blocks).values({ blockerId: hostId, blockedId: applicantId }).returning({ id: blocks.id });
    await db.update(blocks).set({ unblockedAt: new Date() }).where(eq(blocks.id, block.id));

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result.success).toBe(true);
    if (result.success) createdConversationIds.push(result.conversationId);

    const [posting] = await db.select().from(postings).where(eq(postings.id, seeded.postingId));
    expect(posting.seatsOpen).toBe(0);
    await db.delete(blocks).where(eq(blocks.id, block.id));
  });
});
