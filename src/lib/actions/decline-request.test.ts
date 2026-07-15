import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { arrayContains, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, conversations, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { declineRequest } = await import("./decline-request");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

describe("declineRequest (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const hostEmail = `decline-host-${runId}@example.com`;
  const applicantEmail = `decline-applicant-${runId}@example.com`;
  const outsiderEmail = `decline-outsider-${runId}@example.com`;

  let hostId: string;
  let applicantId: string;

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
        seatsOpen: 2,
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

  beforeAll(async () => {
    const [host] = await db
      .insert(users)
      .values({ email: hostEmail, handle: `declinehost${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    hostId = host.id;

    const [applicant] = await db
      .insert(users)
      .values({ email: applicantEmail, handle: `declineapplicant${runId}`, emailVerified: new Date() })
      .returning({ id: users.id });
    applicantId = applicant.id;

    await db
      .insert(users)
      .values({ email: outsiderEmail, handle: `declineoutsider${runId}`, emailVerified: new Date() });
  });

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.applicantId, applicantId));
    await db.delete(postings).where(eq(postings.hostId, hostId));
    await db.delete(users).where(eq(users.email, hostEmail));
    await db.delete(users).where(eq(users.email, applicantEmail));
    await db.delete(users).where(eq(users.email, outsiderEmail));
  });

  it("declines: sets status declined, no change to seatsOpen, no conversation created", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));

    const result = await declineRequest({ applicationId: seeded.applicationId });
    expect(result).toEqual({ success: true });

    const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
    expect(application.status).toBe("declined");

    const [posting] = await db.select().from(postings).where(eq(postings.id, seeded.postingId));
    expect(posting.seatsOpen).toBe(2);

    const convos = await db
      .select()
      .from(conversations)
      .where(arrayContains(conversations.memberIds, [applicantId]));
    expect(convos).toHaveLength(0);
  });

  it("rejects someone other than the posting's host", async () => {
    const seeded = await seedPendingApplication();
    mockedAuth.mockResolvedValueOnce(fakeSession(outsiderEmail));

    const result = await declineRequest({ applicationId: seeded.applicationId });
    expect(result).toEqual({ success: false, error: "You can't decline this request." });

    const [application] = await db.select().from(applications).where(eq(applications.id, seeded.applicationId));
    expect(application.status).toBe("pending");
  });

  it("rejects an already-decided application", async () => {
    const seeded = await seedPendingApplication();
    await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, seeded.applicationId));

    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await declineRequest({ applicationId: seeded.applicationId });
    expect(result).toEqual({ success: false, error: "This request is no longer pending." });
  });

  // Public Profile (022): a host-initiated invite reverses who's
  // authorized -- the INVITED applicant, not the inviting host.
  it("for a host-initiated invite, the invited applicant (not the host) may decline", async () => {
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
        seatsOpen: 2,
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
    const hostAttempt = await declineRequest({ applicationId: invite.id });
    expect(hostAttempt).toEqual({ success: false, error: "You can't decline this request." });

    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const invitedAttempt = await declineRequest({ applicationId: invite.id });
    expect(invitedAttempt).toEqual({ success: true });

    const [application] = await db.select().from(applications).where(eq(applications.id, invite.id));
    expect(application.status).toBe("declined");
  });
});
