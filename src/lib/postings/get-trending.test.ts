import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getTrending } from "./get-trending";

const runId = crypto.randomUUID().slice(0, 8);
const email = `home-trending-${runId}@example.com`;
const popularGame = `Popular-${runId}`;
const rareGame = `Rare-${runId}`;
let hostId: string;

beforeAll(async () => {
  // getTrending() aggregates over the whole table, capped to the top 5
  // -- clear it first so this test's own counts/ranking aren't at the
  // mercy of whatever else exists in the shared dev database (e.g.
  // npm run db:seed-postings' sample data), same fix as e2e/home.spec.ts.
  await db.delete(postings);

  const [host] = await db.insert(users).values({ email, name: "Host" }).returning({ id: users.id });
  hostId = host.id;

  const common = { hostId, title: "t", blurb: "b", vibe: "fun", region: "na-west", seatsTotal: 4 };
  await db.insert(postings).values([
    { ...common, game: popularGame, seatsOpen: 1, status: "open" },
    { ...common, game: popularGame, seatsOpen: 2, status: "open" },
    { ...common, game: popularGame, seatsOpen: 3, status: "open" },
    { ...common, game: rareGame, seatsOpen: 1, status: "open" },
    // A full posting for the rare game shouldn't count -- only 'open' rows do.
    { ...common, game: rareGame, seatsOpen: 0, status: "full" },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("getTrending", () => {
  it("orders games by their count of currently-open postings, descending", async () => {
    const result = await getTrending();
    const popular = result.find((row) => row.game === popularGame);
    const rare = result.find((row) => row.game === rareGame);

    expect(popular?.count).toBe(3);
    expect(rare?.count).toBe(1);
    expect(result.indexOf(popular!)).toBeLessThan(result.indexOf(rare!));
  });

  it("caps results to the top 5", async () => {
    const result = await getTrending();
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
