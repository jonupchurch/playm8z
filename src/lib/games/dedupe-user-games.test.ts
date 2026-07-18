import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { dedupeUserGames, planDedupe } from "./dedupe-user-games";

type Row = typeof userGames.$inferSelect;

// Build an in-memory userGames row for the pure planDedupe tests.
function row(p: { id: string; userId: string; game: string; rank?: string | null; hoursPlayed?: number | null; createdAt?: Date }): Row {
  return {
    id: p.id,
    userId: p.userId,
    game: p.game,
    rank: p.rank ?? null,
    hoursPlayed: p.hoursPlayed ?? null,
    createdAt: p.createdAt ?? new Date("2026-01-01T00:00:00Z"),
  };
}

describe("planDedupe (pure)", () => {
  it("keeps the most-detailed row and drops case/space variants", () => {
    const rows = [
      row({ id: "a", userId: "u1", game: "Halo", createdAt: new Date("2026-01-01T00:00:00Z") }),
      row({ id: "b", userId: "u1", game: "halo", rank: "Diamond", hoursPlayed: 200, createdAt: new Date("2026-02-01T00:00:00Z") }),
      row({ id: "c", userId: "u1", game: " Halo ", createdAt: new Date("2026-01-01T00:00:00Z") }),
    ];
    const plan = planDedupe(rows);
    expect(plan.groups).toBe(1);
    // b wins on detail even though it is the NEWEST -- detail beats recency.
    expect(plan.loserIds.sort()).toEqual(["a", "c"]);
  });

  it("breaks a detail-tie by oldest, then smallest id", () => {
    const rows = [
      row({ id: "new", userId: "u1", game: "CS2", createdAt: new Date("2026-03-01T00:00:00Z") }),
      row({ id: "old", userId: "u1", game: "cs2", createdAt: new Date("2026-01-01T00:00:00Z") }),
    ];
    expect(planDedupe(rows).loserIds).toEqual(["new"]); // older "old" kept

    const sameTime = [
      row({ id: "bbb", userId: "u1", game: "Apex", createdAt: new Date("2026-01-01T00:00:00Z") }),
      row({ id: "aaa", userId: "u1", game: "apex", createdAt: new Date("2026-01-01T00:00:00Z") }),
    ];
    expect(planDedupe(sameTime).loserIds).toEqual(["bbb"]); // smallest id "aaa" kept
  });

  it("leaves distinct games and single rows alone", () => {
    const rows = [
      row({ id: "a", userId: "u1", game: "Valorant" }),
      row({ id: "b", userId: "u1", game: "CS2" }),
    ];
    expect(planDedupe(rows)).toEqual({ loserIds: [], groups: 0 });
  });

  it("scopes grouping per user -- one user's dup never affects another's identical game", () => {
    const rows = [
      row({ id: "a", userId: "u1", game: "Halo" }),
      row({ id: "b", userId: "u1", game: "halo" }),
      row({ id: "c", userId: "u2", game: "Halo" }),
    ];
    const plan = planDedupe(rows);
    expect(plan.groups).toBe(1);
    expect(plan.loserIds).toEqual(["b"]); // u2's "Halo" (c) untouched; u1 keeps older "a"
  });
});

// DB wrapper: the live unique index forbids inserting duplicate rows, so this
// exercises the fetch/delete plumbing and proves it never over-deletes distinct
// rows -- the collapse itself is covered by planDedupe above.
describe("dedupeUserGames (db wrapper)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  let userId: string;
  let otherId: string;

  beforeAll(async () => {
    const [u] = await db.insert(users).values({ email: `dedupe-${runId}@example.com`, handle: `dedupe${runId}` }).returning({ id: users.id });
    userId = u.id;
    const [o] = await db.insert(users).values({ email: `dedupeother-${runId}@example.com`, handle: `dedupeother${runId}` }).returning({ id: users.id });
    otherId = o.id;
    await db.insert(userGames).values([
      { userId, game: "Valorant" },
      { userId, game: "CS2" },
    ]);
    await db.insert(userGames).values({ userId: otherId, game: "Untouchable" });
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, [userId, otherId])); // cascades userGames
  });

  it("is a no-op over distinct rows and never touches another user", async () => {
    const report = await dedupeUserGames([userId, otherId]);
    expect(report).toEqual({ groups: 0, deleted: 0 });

    const mine = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, userId));
    expect(mine.map((g) => g.game).sort()).toEqual(["CS2", "Valorant"]);
    const other = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, otherId));
    expect(other.map((g) => g.game)).toEqual(["Untouchable"]);
  });
});
