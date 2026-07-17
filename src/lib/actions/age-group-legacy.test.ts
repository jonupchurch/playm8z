import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

// 032/ADR 0009's central rule, tested as a pair because it only makes
// sense as one: create-posting is STRICT (the four new values only), and
// manage-posting is deliberately TOLERANT of the legacy value a posting
// already stores.
//
// A posting created before ADR 0009 holds "18"/"21". No UI can produce
// those any more, so these paths have no other test coverage and would
// regress silently. If the tolerance breaks, every host with an old
// posting is stranded: they can't fix a typo in their own title without
// being forced to relabel who their party is for.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { createPosting } = await import("./create-posting");
const { editPosting } = await import("./manage-posting");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `age-legacy-host-${runId}@example.com`;
let hostId: string;
let legacyPostingId: string;

const validPosting = {
  game: "Valorant",
  title: "A party",
  platform: "pc" as const,
  region: "eu-west" as const,
  seatsTotal: 5,
  seatsOpen: 3,
};

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: hostEmail, handle: `agelegacyhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;
  mockedAuth.mockResolvedValue({ user: { email: hostEmail }, expires: new Date(Date.now() + 60_000).toISOString() });

  // A pre-ADR-0009 posting. Inserted directly because no code path can
  // create one any more -- which is exactly why it needs a test.
  const [row] = await db
    .insert(postings)
    .values({
      hostId,
      ...validPosting,
      blurb: "",
      vibe: "fun",
      timeSlots: [],
      tags: [],
      micRequired: false,
      recurring: false,
      ageGroup: "21", // legacy: "21+ only"
      status: "open",
    })
    .returning({ id: postings.id });
  legacyPostingId = row.id;
});

afterAll(async () => {
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(users).where(eq(users.id, hostId));
});

describe("create-posting: strict about the age vocabulary (FR-003, FR-008)", () => {
  it("accepts each of the four offered values", async () => {
    for (const ageGroup of ["any", "18-29", "30-49", "50plus"] as const) {
      expect((await createPosting({ ...validPosting, ageGroup })).success).toBe(true);
    }
  });

  it("rejects the legacy 18 and 21 -- they can never be created anew", async () => {
    // @ts-expect-error -- deliberately submitting a value the schema no
    // longer accepts, as a hand-rolled request could.
    expect((await createPosting({ ...validPosting, ageGroup: "21" })).success).toBe(false);
    // @ts-expect-error -- same.
    expect((await createPosting({ ...validPosting, ageGroup: "18" })).success).toBe(false);
  });

  // FR-015 / SC-007: a host who ignores the field claims nothing.
  it("defaults to `any` when the field is omitted", async () => {
    const result = await createPosting(validPosting);
    expect(result.success).toBe(true);

    const rows = await db.select({ ageGroup: postings.ageGroup }).from(postings).where(eq(postings.hostId, hostId));
    expect(rows.some((row) => row.ageGroup === "any")).toBe(true);
  });
});

describe("manage-posting: tolerant of the legacy value already stored (US3 scenario 5)", () => {
  // THE test. Without it, the silent-relabel trap and the strict parse
  // both look fine in isolation.
  it("lets a host re-save a legacy posting unchanged, keeping its stored age", async () => {
    const result = await editPosting(legacyPostingId, {
      ...validPosting,
      title: "A new title",
      // @ts-expect-error -- what the edit form submits for a legacy row:
      // the stored value, carried as its own <option>.
      ageGroup: "21",
    });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(postings).where(eq(postings.id, legacyPostingId));
    expect(row.title).toBe("A new title");
    expect(row.ageGroup).toBe("21"); // never relabelled (FR-011)
  });

  it("lets that host move off the legacy value deliberately", async () => {
    const result = await editPosting(legacyPostingId, { ...validPosting, ageGroup: "30-49" });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(postings).where(eq(postings.id, legacyPostingId));
    expect(row.ageGroup).toBe("30-49");
  });

  // Tolerance is only ever for the value already there -- never an
  // amnesty on the retired vocabulary.
  it("refuses a switch TO a legacy value once the posting has moved off it", async () => {
    // @ts-expect-error -- deliberately invalid.
    const result = await editPosting(legacyPostingId, { ...validPosting, ageGroup: "21" });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(postings).where(eq(postings.id, legacyPostingId));
    expect(row.ageGroup).toBe("30-49"); // unchanged by the rejected edit
  });
});
