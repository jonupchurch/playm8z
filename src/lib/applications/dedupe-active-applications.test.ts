import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";
import { dedupeActiveApplications, planDedupe } from "./dedupe-active-applications";

type Row = typeof applications.$inferSelect;

function row(p: { id: string; postingId?: string; applicantId?: string; status?: string; createdAt?: Date }): Row {
  return {
    id: p.id,
    postingId: p.postingId ?? "p1",
    applicantId: p.applicantId ?? "a1",
    message: null,
    status: p.status ?? "pending",
    initiatedBy: "applicant",
    createdAt: p.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    acceptedAt: null,
  };
}

describe("planDedupe (pure)", () => {
  it("keeps accepted over pending, even if the accepted row is newer", () => {
    const plan = planDedupe([
      row({ id: "pend", status: "pending", createdAt: new Date("2026-01-01T00:00:00Z") }),
      row({ id: "acc", status: "accepted", createdAt: new Date("2026-02-01T00:00:00Z") }),
    ]);
    expect(plan.groups).toBe(1);
    expect(plan.loserIds).toEqual(["pend"]);
  });

  it("breaks a same-status tie by oldest, then smallest id", () => {
    expect(
      planDedupe([
        row({ id: "new", status: "pending", createdAt: new Date("2026-03-01T00:00:00Z") }),
        row({ id: "old", status: "pending", createdAt: new Date("2026-01-01T00:00:00Z") }),
      ]).loserIds,
    ).toEqual(["new"]);

    expect(
      planDedupe([
        row({ id: "bbb", status: "pending", createdAt: new Date("2026-01-01T00:00:00Z") }),
        row({ id: "aaa", status: "pending", createdAt: new Date("2026-01-01T00:00:00Z") }),
      ]).loserIds,
    ).toEqual(["bbb"]);
  });

  it("ignores terminal rows -- declined/withdrawn neither group nor get deleted", () => {
    const plan = planDedupe([
      row({ id: "active", status: "pending" }),
      row({ id: "dec", status: "declined" }),
      row({ id: "wd", status: "withdrawn" }),
    ]);
    expect(plan).toEqual({ loserIds: [], groups: 0 });
  });

  it("scopes by (posting, applicant); a different pair is independent", () => {
    const plan = planDedupe([
      row({ id: "a", postingId: "p1", applicantId: "u1" }),
      row({ id: "b", postingId: "p1", applicantId: "u1", createdAt: new Date("2026-02-01T00:00:00Z") }),
      row({ id: "c", postingId: "p2", applicantId: "u1" }),
    ]);
    expect(plan.groups).toBe(1);
    expect(plan.loserIds).toEqual(["b"]); // p1/u1 keeps the older "a"; p2/u1 untouched
  });
});

// The live partial unique index makes duplicate active rows un-insertable, so this
// exercises the fetch/delete plumbing over distinct rows -- the collapse itself is
// covered by planDedupe above.
describe("dedupeActiveApplications (db wrapper)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  let postingId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const [host] = await db
      .insert(users)
      .values({ email: `dda-host-${runId}@example.com`, handle: `ddahost${runId}` })
      .returning({ id: users.id });
    userIds.push(host.id);
    const [posting] = await db
      .insert(postings)
      .values({
        hostId: host.id,
        game: `DDA ${runId}`,
        title: "t",
        blurb: "b",
        vibe: "fun",
        region: "na-east",
        ageGroup: "18",
        timeSlots: ["evening"],
        platform: "pc",
        seatsTotal: 4,
        seatsOpen: 4,
        status: "open",
      })
      .returning({ id: postings.id });
    postingId = posting.id;
    for (let i = 0; i < 2; i++) {
      const [u] = await db
        .insert(users)
        .values({ email: `dda-app${i}-${runId}@example.com`, handle: `ddaapp${i}${runId}` })
        .returning({ id: users.id });
      userIds.push(u.id);
      await db.insert(applications).values({ postingId, applicantId: u.id, status: "pending" });
    }
  });

  afterAll(async () => {
    await db.delete(applications).where(eq(applications.postingId, postingId));
    await db.delete(postings).where(eq(postings.id, postingId));
    await db.delete(users).where(inArray(users.id, userIds));
  });

  it("is a no-op over distinct active applications", async () => {
    expect(await dedupeActiveApplications([postingId])).toEqual({ groups: 0, deleted: 0 });
    const rows = await db.select().from(applications).where(eq(applications.postingId, postingId));
    expect(rows).toHaveLength(2);
  });
});
