import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";
import { getRoster } from "./get-roster";

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `roster-host-${runId}@example.com`;
const memberEmail = `roster-member-${runId}@example.com`;
const pendingEmail = `roster-pending-${runId}@example.com`;
let hostId: string;
let postingId: string;

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `rosterhost${runId}` })
    .returning({ id: users.id });
  hostId = host.id;

  const [member] = await db
    .insert(users)
    .values({ email: memberEmail, handle: `rostermember${runId}` })
    .returning({ id: users.id });

  const [pendingApplicant] = await db
    .insert(users)
    .values({ email: pendingEmail, handle: `rosterpending${runId}` })
    .returning({ id: users.id });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId,
      game: `RosterGame-${runId}`,
      title: "Roster test",
      blurb: "b",
      vibe: "fun",
      region: "na-east",
      ageGroup: "18",
      timeSlots: ["evening"],
      platform: "pc",
      micRequired: false,
      seatsTotal: 5,
      seatsOpen: 2,
      status: "open",
    })
    .returning({ id: postings.id });
  postingId = posting.id;

  await db.insert(applications).values([
    { postingId, applicantId: member.id, status: "accepted" },
    { postingId, applicantId: pendingApplicant.id, status: "pending" },
  ]);
});

afterAll(async () => {
  await db.delete(applications).where(eq(applications.postingId, postingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, hostEmail));
  await db.delete(users).where(eq(users.email, memberEmail));
  await db.delete(users).where(eq(users.email, pendingEmail));
});

describe("getRoster", () => {
  it("always includes the host as the first row", async () => {
    const roster = await getRoster({ postingId, hostId, seatsTotal: 5 });
    expect(roster.rows[0]).toEqual({ kind: "host", handle: `rosterhost${runId}`, avatarColor: null });
  });

  it("includes only accepted applicants as members, not pending ones", async () => {
    const roster = await getRoster({ postingId, hostId, seatsTotal: 5 });
    const memberRows = roster.rows.filter((row) => row.kind === "member");
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]).toMatchObject({ handle: `rostermember${runId}` });
  });

  it("computes the open count as seatsTotal - 1 (host) - acceptedCount, with that many dashed open rows", async () => {
    const roster = await getRoster({ postingId, hostId, seatsTotal: 5 });
    expect(roster.openCount).toBe(3); // 5 - 1 host - 1 accepted member
    const openRows = roster.rows.filter((row) => row.kind === "open");
    expect(openRows).toHaveLength(3);
  });

  it("never goes below 0 open slots even if accepted count would overflow", async () => {
    const roster = await getRoster({ postingId, hostId, seatsTotal: 1 });
    expect(roster.openCount).toBe(0);
  });

  it("carries no role/class label on any row (ADR 0004)", async () => {
    const roster = await getRoster({ postingId, hostId, seatsTotal: 5 });
    for (const row of roster.rows) {
      expect(row).not.toHaveProperty("role");
    }
  });
});
