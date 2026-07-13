import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { withdrawApplication } = await import("./withdraw-application");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const applicantEmail = `withdraw-applicant-${runId}@example.com`;
const otherEmail = `withdraw-other-${runId}@example.com`;
let postingId: string;
let pendingApplicationId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: `withdraw-host-${runId}@example.com`, handle: `withdrawhost${runId}` })
    .returning({ id: users.id });

  const [applicant] = await db
    .insert(users)
    .values({ email: applicantEmail, handle: `withdrawapplicant${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });

  await db.insert(users).values({
    email: otherEmail,
    handle: `withdrawother${runId}`,
    emailVerified: new Date(),
  });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: host.id,
      game: `Withdraw-${runId}`,
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

  const [application] = await db
    .insert(applications)
    .values({ postingId, applicantId: applicant.id, status: "pending" })
    .returning({ id: applications.id });
  pendingApplicationId = application.id;
});

afterAll(async () => {
  await db.delete(applications).where(eq(applications.postingId, postingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, applicantEmail));
  await db.delete(users).where(eq(users.email, otherEmail));
  await db.delete(users).where(eq(users.handle, `withdrawhost${runId}`));
});

describe("withdrawApplication", () => {
  it("rejects a user withdrawing someone else's application", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await withdrawApplication(pendingApplicationId);
    expect(result.success).toBe(false);

    const [row] = await db.select().from(applications).where(eq(applications.id, pendingApplicationId));
    expect(row.status).toBe("pending");
  });

  it("sets status to withdrawn for the application's own applicant", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await withdrawApplication(pendingApplicationId);
    expect(result.success).toBe(true);

    const [row] = await db.select().from(applications).where(eq(applications.id, pendingApplicationId));
    expect(row.status).toBe("withdrawn");
  });

  it("rejects withdrawing an application that's already withdrawn", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(applicantEmail));
    const result = await withdrawApplication(pendingApplicationId);
    expect(result.success).toBe(false);
  });
});
