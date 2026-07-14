import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getTopGames } from "./get-top-games";

// FR-004: get-top-games.ts is a thin re-export of get-trending.ts's
// already-tested query (research.md #4) -- this just confirms the
// wiring reflects real open-posting counts, not a full re-test of
// get-trending.test.ts's own edge cases.
describe("getTopGames (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `top-games-${runId}@example.com`;
  const game = `Top Games Test ${runId}`;
  let userId: string;
  let postingIds: string[] = [];

  afterAll(async () => {
    await db.delete(postings).where(inArray(postings.id, postingIds));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("ranks a distinctive game #1 once it strictly outnumbers every existing top game", async () => {
    const before = await getTopGames();
    // Whatever else is in the shared table, out-count the current
    // leader by 1 to guarantee rank #1 regardless of pre-existing data.
    const neededCount = (before[0]?.count ?? 0) + 1;

    const [user] = await db
      .insert(users)
      .values({ email, handle: `topgames${runId}` })
      .returning({ id: users.id });
    userId = user.id;

    const rows = await db
      .insert(postings)
      .values(
        Array.from({ length: neededCount }, () => ({
          hostId: userId,
          game,
          title: "Test posting",
          blurb: "blurb",
          vibe: "casual",
          region: "na-west",
          seatsTotal: 4,
          seatsOpen: 4,
          status: "open" as const,
          ageGroup: "18" as const,
          timeSlots: ["evening"],
          platform: "pc",
        })),
      )
      .returning({ id: postings.id });
    postingIds = rows.map((row) => row.id);

    const after = await getTopGames();
    expect(after[0]).toEqual({ game, count: neededCount });
  });
});
