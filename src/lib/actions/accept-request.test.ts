import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, messages, postings, users } from "@/db/schema";

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
    await db.delete(postings).where(eq(postings.hostId, hostId));
    await db.delete(users).where(eq(users.email, hostEmail));
    await db.delete(users).where(eq(users.email, applicantEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("accepts: sets status accepted, decrements seatsOpen, creates a conversation with a system message", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const result = await acceptRequest({ applicationId: seeded.applicationId });
    expect(result.success).toBe(true);
    if (!result.success) return;
    createdConversationIds.push(result.conversationId);

    const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
    expect(application.status).toBe("accepted");

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
});
