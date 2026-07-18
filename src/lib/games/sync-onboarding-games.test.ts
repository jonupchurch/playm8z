import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { syncOnboardingGames } from "./sync-onboarding-games";

const runId = crypto.randomUUID().slice(0, 8);
let userId: string;
let otherId: string;

async function gamesFor(id: string): Promise<string[]> {
  const rows = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, id));
  return rows.map((r) => r.game).sort();
}

beforeAll(async () => {
  const [u] = await db.insert(users).values({ email: `sync-${runId}@example.com`, handle: `sync${runId}` }).returning({ id: users.id });
  userId = u.id;
  const [o] = await db.insert(users).values({ email: `syncother-${runId}@example.com`, handle: `syncother${runId}` }).returning({ id: users.id });
  otherId = o.id;
  // The other user has a game that must never be touched.
  await db.insert(userGames).values({ userId: otherId, game: "Untouchable" });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId)); // cascades userGames
  await db.delete(users).where(eq(users.id, otherId));
});

describe("syncOnboardingGames", () => {
  it("inserts selected games on an empty user", async () => {
    await syncOnboardingGames(userId, ["Valorant", "CS2"]);
    expect(await gamesFor(userId)).toEqual(["CS2", "Valorant"]);
  });

  it("dedups names that normalize to the same game", async () => {
    await syncOnboardingGames(userId, ["Valorant", "valorant", "  Valorant  ", "CS2"]);
    expect(await gamesFor(userId)).toEqual(["CS2", "Valorant"]);
  });

  it("removes de-selected games and adds newly-selected ones", async () => {
    await syncOnboardingGames(userId, ["CS2", "Apex Legends"]);
    expect(await gamesFor(userId)).toEqual(["Apex Legends", "CS2"]); // Valorant removed, Apex added
  });

  it("is idempotent for the same selection", async () => {
    const before = await gamesFor(userId);
    await syncOnboardingGames(userId, ["CS2", "Apex Legends"]);
    expect(await gamesFor(userId)).toEqual(before);
  });

  it("clears all games when passed an empty selection", async () => {
    await syncOnboardingGames(userId, []);
    expect(await gamesFor(userId)).toEqual([]);
  });

  it("never touches another user's rows", async () => {
    await syncOnboardingGames(userId, ["Halo"]);
    expect(await gamesFor(otherId)).toEqual(["Untouchable"]);
  });
});
