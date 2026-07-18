import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { backfillUserGames, dedupeGameNames } from "./backfill-user-games";

const runId = crypto.randomUUID().slice(0, 8);
let legacyId: string; // gamesPlayed, no userGames -> should seed
let curatedId: string; // gamesPlayed AND userGames -> must be untouched
let emptyId: string; // no gamesPlayed, no userGames -> nothing

async function gamesFor(id: string): Promise<string[]> {
  const rows = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, id));
  return rows.map((r) => r.game).sort();
}

beforeAll(async () => {
  const [a] = await db
    .insert(users)
    .values({ email: `bf-legacy-${runId}@example.com`, handle: `bflegacy${runId}`, gamesPlayed: ["Halo", "Halo", "halo"] })
    .returning({ id: users.id });
  legacyId = a.id;

  const [b] = await db
    .insert(users)
    .values({ email: `bf-curated-${runId}@example.com`, handle: `bfcurated${runId}`, gamesPlayed: ["Fortnite"] })
    .returning({ id: users.id });
  curatedId = b.id;
  await db.insert(userGames).values({ userId: curatedId, game: "Apex" });

  const [c] = await db
    .insert(users)
    .values({ email: `bf-empty-${runId}@example.com`, handle: `bfempty${runId}` })
    .returning({ id: users.id });
  emptyId = c.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, legacyId)); // cascades userGames
  await db.delete(users).where(eq(users.id, curatedId));
  await db.delete(users).where(eq(users.id, emptyId));
});

describe("dedupeGameNames", () => {
  it("dedups by normalized name and drops blanks", () => {
    expect(dedupeGameNames(["Halo", "halo", " Halo ", "", "  ", "CS2"])).toEqual(["Halo", "CS2"]);
  });
});

describe("backfillUserGames", () => {
  it("seeds only empty-userGames players, leaves curated players untouched, and is idempotent", async () => {
    const report = await backfillUserGames([legacyId, curatedId, emptyId]);
    expect(report).toEqual({ seeded: 1, skippedCurated: 1, empty: 1 });

    expect(await gamesFor(legacyId)).toEqual(["Halo"]); // seeded + deduped
    expect(await gamesFor(curatedId)).toEqual(["Apex"]); // Fortnite NOT added
    expect(await gamesFor(emptyId)).toEqual([]); // nothing to seed

    // Idempotent: the second run seeds nobody (legacy now has userGames).
    const second = await backfillUserGames([legacyId, curatedId, emptyId]);
    expect(second).toEqual({ seeded: 0, skippedCurated: 2, empty: 1 });
    expect(await gamesFor(legacyId)).toEqual(["Halo"]); // no duplicate
  });
});
