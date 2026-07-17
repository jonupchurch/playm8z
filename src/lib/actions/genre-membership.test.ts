import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postings, settings, users } from "@/db/schema";

// 030's central design rule, tested in one place because it only makes
// sense as a pair: create-posting.ts is STRICT about genre membership,
// manage-posting.ts is deliberately TOLERANT of the genre a posting
// already stores (research.md #4).
//
// Getting this wrong in the obvious direction -- applying create's rule
// to edits -- strands every host whose genre an admin retired: they
// could never edit their own posting's title again without also being
// forced to relabel its genre. That is the single most likely way to
// break this feature, so it gets a dedicated file.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { createPosting } = await import("./create-posting");
const { editPosting } = await import("./manage-posting");
const { getSettings, invalidateSettingsCache } = await import("@/lib/settings/get-settings");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const hostEmail = `genre-membership-host-${runId}@example.com`;
const LISTED = `Listed ${runId}`;
const RETIRED = `Retired ${runId}`;
let hostId: string;
let retiredGenrePostingId: string;
// `settings` is a SHARED SINGLETON ROW -- captured and restored
// unconditionally, or it leaks into whichever file runs next.
let originalGenres: string[];

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
    .values({ email: hostEmail, handle: `genremembhost${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  hostId = host.id;
  mockedAuth.mockResolvedValue({ user: { email: hostEmail }, expires: new Date(Date.now() + 60_000).toISOString() });

  originalGenres = (await getSettings()).genres;

  // A posting tagged with a genre that is then retired -- the exact
  // state an admin creates by removing a genre that's already in use.
  const [row] = await db
    .insert(postings)
    // Several columns are NOT NULL with no database default -- on the
    // real paths postingSchema's own defaults fill them, so a direct
    // insert has to supply them itself.
    .values({
      hostId,
      ...validPosting,
      blurb: "",
      vibe: "fun",
      timeSlots: [],
      tags: [],
      micRequired: false,
      recurring: false,
      genre: RETIRED,
      ageGroup: "18",
      status: "open",
    })
    .returning({ id: postings.id });
  retiredGenrePostingId = row.id;

  // The list now offers LISTED but not RETIRED.
  await db.update(settings).set({ genres: [...originalGenres, LISTED] });
  invalidateSettingsCache();
});

afterAll(async () => {
  await db.update(settings).set({ genres: originalGenres });
  invalidateSettingsCache();
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(users).where(inArray(users.id, [hostId]));
});

describe("create-posting: strict about genre membership (FR-008)", () => {
  it("accepts a genre that's in the admin's list", async () => {
    const result = await createPosting({ ...validPosting, genre: LISTED });
    expect(result.success).toBe(true);
  });

  it("rejects a genre that isn't", async () => {
    const result = await createPosting({ ...validPosting, genre: RETIRED });
    expect(result.success).toBe(false);
  });

  it("accepts no genre at all -- it's optional", async () => {
    const result = await createPosting({ ...validPosting, genre: "" });
    expect(result.success).toBe(true);
  });
});

describe("manage-posting: tolerant of the genre already stored (US2 scenario 5)", () => {
  // THE test. An admin retired this posting's genre; its host must still
  // be able to edit the title.
  it("lets a host re-save a posting whose genre has since been retired, keeping that genre", async () => {
    const result = await editPosting(retiredGenrePostingId, {
      ...validPosting,
      title: "A new title",
      genre: RETIRED,
    });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(postings).where(eq(postings.id, retiredGenrePostingId));
    expect(row.title).toBe("A new title");
    expect(row.genre).toBe(RETIRED); // never rewritten (FR-007)
  });

  it("lets that host switch to a genre that IS listed", async () => {
    const result = await editPosting(retiredGenrePostingId, { ...validPosting, genre: LISTED });
    expect(result).toEqual({ success: true });

    const [row] = await db.select().from(postings).where(eq(postings.id, retiredGenrePostingId));
    expect(row.genre).toBe(LISTED);
  });

  // Tolerance is only for the value already there -- not a general
  // amnesty on retired genres.
  it("refuses a switch TO a retired genre", async () => {
    const result = await editPosting(retiredGenrePostingId, { ...validPosting, genre: RETIRED });
    expect(result.success).toBe(false);

    const [row] = await db.select().from(postings).where(eq(postings.id, retiredGenrePostingId));
    expect(row.genre).toBe(LISTED); // unchanged by the rejected edit
  });
});
