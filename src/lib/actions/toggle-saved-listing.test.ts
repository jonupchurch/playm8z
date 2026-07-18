import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, savedListings, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleSavedListing } = await import("./toggle-saved-listing");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `save-verified-${runId}@example.com`;
const unverifiedEmail = `save-unverified-${runId}@example.com`;
let userId: string;
let postingId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email: `save-host-${runId}@example.com`, handle: `savehost${runId}` })
    .returning({ id: users.id });

  const [user] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `saveverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  userId = user.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `saveunverified${runId}` });

  const [posting] = await db
    .insert(postings)
    .values({
      hostId: host.id,
      game: `Save-${runId}`,
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
});

afterAll(async () => {
  await db.delete(savedListings).where(eq(savedListings.postingId, postingId));
  await db.delete(postings).where(eq(postings.id, postingId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.handle, `savehost${runId}`));
});

describe("toggleSavedListing", () => {
  it("saves a listing (inserts a row) on first toggle", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleSavedListing(postingId);
    expect(result).toEqual({ success: true, saved: true });

    const [row] = await db
      .select()
      .from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.postingId, postingId)));
    expect(row).toBeDefined();
  });

  it("unsaves (deletes the row) on the next toggle", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleSavedListing(postingId);
    expect(result).toEqual({ success: true, saved: false });

    const rows = await db
      .select()
      .from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.postingId, postingId)));
    expect(rows).toHaveLength(0);
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleSavedListing(postingId);
    expect(result.success).toBe(false);
  });

  it("a raced double-save degrades to an idempotent success instead of throwing", async () => {
    // Start from not-saved so the concurrent calls race the INSERT path.
    await db
      .delete(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.postingId, postingId)));

    mockedAuth.mockResolvedValue(fakeSession(verifiedEmail));
    // Pre-fix, whichever call lost the INSERT race threw an uncaught
    // DrizzleQueryError, rejecting the whole Promise.all. Post-fix the
    // composite-PK violation is caught and every call returns a success.
    const results = await Promise.all([
      toggleSavedListing(postingId),
      toggleSavedListing(postingId),
      toggleSavedListing(postingId),
    ]);
    mockedAuth.mockReset();

    for (const r of results) {
      expect(r.success).toBe(true);
    }

    // The composite PK held: never more than one row for the pair.
    const rows = await db
      .select()
      .from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.postingId, postingId)));
    expect(rows.length).toBeLessThanOrEqual(1);

    await db
      .delete(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.postingId, postingId)));
  });
});
