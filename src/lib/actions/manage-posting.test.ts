import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { closePosting, editPosting, reopenPosting } = await import("./manage-posting");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `manage-posting-host-${runId}@example.com`;
const otherEmail = `manage-posting-other-${runId}@example.com`;
let hostId: string;
let editablePostingId: string;
let acceptedPostingId: string;
let openPostingId: string;
let closedPostingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

const validEdit = {
  game: "Valorant",
  title: "Updated title",
  platform: "pc" as const,
  region: "eu-west" as const,
  seatsTotal: 5,
  seatsOpen: 3,
};

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `managepostinghost${runId}` })
    .returning({ id: users.id });
  hostId = host.id;

  const [applicant] = await db
    .insert(users)
    .values({ email: otherEmail, handle: `managepostingother${runId}` })
    .returning({ id: users.id });

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
    seatsOpen: 2,
    status: "open" as const,
  };

  const [editable] = await db
    .insert(postings)
    .values({ ...base, game: `ManagePostingEditable-${runId}` })
    .returning({ id: postings.id });
  editablePostingId = editable.id;

  const [accepted] = await db
    .insert(postings)
    .values({ ...base, game: `ManagePostingAccepted-${runId}` })
    .returning({ id: postings.id });
  acceptedPostingId = accepted.id;
  await db.insert(applications).values({
    postingId: acceptedPostingId,
    applicantId: applicant.id,
    status: "accepted",
  });

  const [open] = await db
    .insert(postings)
    .values({ ...base, game: `ManagePostingOpen-${runId}` })
    .returning({ id: postings.id });
  openPostingId = open.id;

  const [closed] = await db
    .insert(postings)
    .values({ ...base, game: `ManagePostingClosed-${runId}`, status: "closed" })
    .returning({ id: postings.id });
  closedPostingId = closed.id;
});

afterAll(async () => {
  for (const id of [editablePostingId, acceptedPostingId, openPostingId, closedPostingId]) {
    await db.delete(applications).where(eq(applications.postingId, id));
    await db.delete(postings).where(eq(postings.id, id));
  }
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, otherEmail));
});

describe("editPosting", () => {
  it("succeeds for a posting with no accepted applications", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await editPosting(editablePostingId, validEdit);
    expect(result.success).toBe(true);

    const [row] = await db.select().from(postings).where(eq(postings.id, editablePostingId));
    expect(row.title).toBe("Updated title");
  });

  it("is blocked once an application has been accepted", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await editPosting(acceptedPostingId, validEdit);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/accepted/i);
  });

  it("rejects a non-host session editing someone else's posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await editPosting(editablePostingId, validEdit);
    expect(result.success).toBe(false);
  });
});

describe("closePosting / reopenPosting", () => {
  it("closes an open posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await closePosting(openPostingId);
    expect(result.success).toBe(true);

    const [row] = await db.select().from(postings).where(eq(postings.id, openPostingId));
    expect(row.status).toBe("closed");
  });

  it("reopens a closed posting", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(hostEmail));
    const result = await reopenPosting(closedPostingId);
    expect(result.success).toBe(true);

    const [row] = await db.select().from(postings).where(eq(postings.id, closedPostingId));
    expect(row.status).toBe("open");
  });

  it("rejects closing a posting that isn't the session's own", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await closePosting(editablePostingId);
    expect(result.success).toBe(false);
  });
});
