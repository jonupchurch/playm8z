import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { browseFiltersSchema } from "@/lib/validations/browse-filters";
import { searchPostings as searchPostingsRaw } from "./search-postings";

function searchPostings(raw: Record<string, unknown>) {
  return searchPostingsRaw(browseFiltersSchema.parse(raw));
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `browse-search-${runId}@example.com`;
const tag = (game: string) => `${game}-${runId}`;
let hostId: string;

beforeAll(async () => {
  const [host] = await db
    .insert(users)
    .values({ email, handle: `browsehost${runId}`, avatarColor: "amber-orange" })
    .returning({ id: users.id });
  hostId = host.id;

  const base = {
    hostId,
    blurb: "blurb text",
    seatsTotal: 5,
    micRequired: false,
    ageGroup: "18",
    platform: "pc",
  };

  await db.insert(postings).values([
    {
      ...base,
      game: tag("Valorant"),
      genre: "FPS",
      title: "Ranked grind",
      vibe: "serious",
      region: "eu-west",
      timeSlots: ["evening"],
      seatsOpen: 3,
      micRequired: true,
      status: "open",
      createdAt: new Date(Date.now() - 2 * 60_000),
      scheduledDate: new Date(Date.now() + 60 * 60_000),
    },
    {
      ...base,
      game: tag("Helldivers 2"),
      genre: "Co-op PvE",
      title: tag("Casual dives"),
      vibe: "fun",
      region: "na-west",
      timeSlots: ["morning", "afternoon"],
      seatsOpen: 1,
      status: "open",
      createdAt: new Date(Date.now() - 60 * 60_000),
      scheduledDate: null,
    },
    {
      ...base,
      game: tag("Catan"),
      genre: "Tabletop",
      title: "Board game night",
      vibe: "fun",
      region: "eu-west",
      timeSlots: ["weekend"],
      platform: "table",
      seatsOpen: 2,
      ageGroup: "21",
      status: "open",
      createdAt: new Date(Date.now() - 30 * 60_000),
      scheduledDate: new Date(Date.now() + 24 * 60 * 60_000),
    },
    {
      ...base,
      game: tag("Full Game"),
      genre: "FPS",
      title: "This one is full",
      vibe: "serious",
      region: "eu-west",
      timeSlots: ["evening"],
      seatsOpen: 0,
      status: "full",
      createdAt: new Date(),
      scheduledDate: null,
    },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

function titles(rows: Awaited<ReturnType<typeof searchPostings>>) {
  return rows.map((row) => row.title);
}

describe("searchPostings", () => {
  it("only returns rows with status = 'open'", async () => {
    const result = await searchPostings({ q: `${runId}` });
    expect(titles(result)).not.toContain("This one is full");
  });

  it("matches keyword against game, title, blurb, genre, or host handle", async () => {
    expect(titles(await searchPostings({ q: tag("Valorant") }))).toEqual(["Ranked grind"]);
    expect(titles(await searchPostings({ q: tag("Casual dives") }))).toEqual([tag("Casual dives")]);
    expect(titles(await searchPostings({ q: `browsehost${runId}` }))).toHaveLength(3);
  });

  it("combines facets across different types with AND", async () => {
    const result = await searchPostings({
      q: runId,
      genres: ["FPS"],
      regions: ["eu-west"],
    });
    expect(titles(result)).toEqual(["Ranked grind"]);
  });

  it("combines multiple values within one facet with OR", async () => {
    const result = await searchPostings({ q: runId, genres: ["FPS", "Tabletop"] });
    expect(titles(result).sort()).toEqual(["Board game night", "Ranked grind"]);
  });

  it("matches timeSlots with array-overlap OR semantics", async () => {
    const result = await searchPostings({ q: runId, timeSlots: ["morning", "weekend"] });
    expect(titles(result).sort()).toEqual(["Board game night", tag("Casual dives")].sort());
  });

  it("filters by ageGroup", async () => {
    const result = await searchPostings({ q: runId, ageGroup: "21" });
    expect(titles(result)).toEqual(["Board game night"]);
  });

  it("filters by minimum open slots", async () => {
    const result = await searchPostings({ q: runId, openSlots: "3" });
    expect(titles(result)).toEqual(["Ranked grind"]);
  });

  it("filters by platform", async () => {
    const result = await searchPostings({ q: runId, platform: "table" });
    expect(titles(result)).toEqual(["Board game night"]);
  });

  it("filters by mic required", async () => {
    const result = await searchPostings({ q: runId, micRequired: "true" });
    expect(titles(result)).toEqual(["Ranked grind"]);
  });

  it("sorts by open seats descending", async () => {
    const result = await searchPostings({ q: runId, sort: "seats" });
    expect(titles(result)).toEqual(["Ranked grind", "Board game night", tag("Casual dives")]);
  });

  it("sorts Soonest ascending by scheduledDate, nulls last", async () => {
    const result = await searchPostings({ q: runId, sort: "soon" });
    expect(titles(result)).toEqual(["Ranked grind", "Board game night", tag("Casual dives")]);
  });
});
