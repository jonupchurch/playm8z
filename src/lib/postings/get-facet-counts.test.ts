import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { browseFiltersSchema } from "@/lib/validations/browse-filters";
import { getGameFacetCounts, getRegionFacetCounts } from "./get-facet-counts";

const runId = crypto.randomUUID().slice(0, 8);
const email = `browse-facets-${runId}@example.com`;
const gameA = `GameA-${runId}`;
const gameB = `GameB-${runId}`;
let hostId: string;

beforeAll(async () => {
  // getRegionFacetCounts returns all 6 fixed regions with a real count
  // each -- clear the table first so those counts (and "asia should be
  // 0") aren't at the mercy of whatever else exists in the shared dev
  // database, same fix as get-trending.test.ts/e2e/home.spec.ts.
  await db.delete(postings);

  const [host] = await db.insert(users).values({ email, handle: `facethost${runId}` }).returning({
    id: users.id,
  });
  hostId = host.id;

  const base = {
    hostId,
    blurb: "b",
    title: "t",
    ageGroup: "18",
    platform: "pc",
    micRequired: false,
    seatsTotal: 4,
    status: "open" as const,
  };

  await db.insert(postings).values([
    { ...base, game: gameA, genre: "FPS", vibe: "serious", region: "eu-west", timeSlots: ["evening"], seatsOpen: 2 },
    { ...base, game: gameA, genre: "FPS", vibe: "fun", region: "na-west", timeSlots: ["evening"], seatsOpen: 1 },
    { ...base, game: gameB, genre: "RPG", vibe: "fun", region: "na-west", timeSlots: ["evening"], seatsOpen: 3 },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("getGameFacetCounts", () => {
  it("counts each game among currently-open postings", async () => {
    const filters = browseFiltersSchema.parse({});
    const result = await getGameFacetCounts(filters);
    expect(result.find((row) => row.value === gameA)?.count).toBe(2);
    expect(result.find((row) => row.value === gameB)?.count).toBe(1);
  });

  it("keeps an option in the list with count 0 when another active facet excludes every row for it, rather than dropping it", async () => {
    // vibe=serious only matches one of gameA's two rows and none of
    // gameB's -- gameB must still appear, with count 0, not disappear.
    const filters = browseFiltersSchema.parse({ vibe: "serious" });
    const result = await getGameFacetCounts(filters);
    const gameBRow = result.find((row) => row.value === gameB);
    expect(gameBRow).toBeDefined();
    expect(gameBRow?.count).toBe(0);
  });

  it("does not let the Game facet's own selection affect its own counts", async () => {
    // Selecting gameA as an active Game filter shouldn't zero out
    // gameB's count -- the facet excludes itself from its own count
    // scoping (only OTHER active facets narrow it).
    const filters = browseFiltersSchema.parse({ games: [gameA] });
    const result = await getGameFacetCounts(filters);
    expect(result.find((row) => row.value === gameB)?.count).toBe(1);
  });
});

describe("getRegionFacetCounts", () => {
  it("returns all 6 regions, including ones with a count of 0", async () => {
    const filters = browseFiltersSchema.parse({});
    const result = await getRegionFacetCounts(filters);
    expect(result).toHaveLength(6);
    expect(result.find((row) => row.value === "eu-west")?.count).toBeGreaterThanOrEqual(1);
    expect(result.find((row) => row.value === "asia")?.count).toBe(0);
  });
});

describe("facet counts with a keyword search active", () => {
  // Regression test: buildFilterConditions' keyword-search condition can
  // reference users.handle (matching a host's handle), which requires
  // both facet-count queries to join `users` -- without that join this
  // throws a real Postgres error ("missing FROM-clause entry for table
  // \"user\"") the moment a visitor types anything into Browse's search
  // box, caught by e2e/browse.spec.ts rather than by this file originally.
  it("getGameFacetCounts doesn't throw when q is set", async () => {
    const filters = browseFiltersSchema.parse({ q: gameA });
    await expect(getGameFacetCounts(filters)).resolves.toBeDefined();
  });

  it("getRegionFacetCounts doesn't throw when q is set", async () => {
    const filters = browseFiltersSchema.parse({ q: gameA });
    await expect(getRegionFacetCounts(filters)).resolves.toBeDefined();
  });
});
