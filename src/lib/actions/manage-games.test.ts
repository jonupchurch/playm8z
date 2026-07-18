import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { addUserGame, removeUserGame } = await import("./manage-games");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `manage-games-${runId}@example.com`;
const otherEmail = `manage-games-other-${runId}@example.com`;
let userId: string;

function fakeSession(sessionEmail: string) {
  return { user: { email: sessionEmail }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, handle: `managegames${runId}` })
    .returning({ id: users.id });
  userId = user.id;
  await db.insert(users).values({ email: otherEmail, handle: `managegamesother${runId}` });
});

afterAll(async () => {
  await db.delete(userGames).where(eq(userGames.userId, userId));
  await db.delete(users).where(eq(users.email, email));
  await db.delete(users).where(eq(users.email, otherEmail));
});

describe("addUserGame", () => {
  it("adds a game with rank and hours", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    const result = await addUserGame({ game: "Valorant", rank: "Diamond 1", hoursPlayed: 340 });
    expect(result.success).toBe(true);

    const rows = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].game).toBe("Valorant");
    expect(rows[0].rank).toBe("Diamond 1");
  });

  it("rejects an empty game name", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    const result = await addUserGame({ game: "" });
    expect(result.success).toBe(false);
  });

  // 043 (ADR 0016) US1/US3 -- app-side dedup layer: re-adding a game the player
  // already has (exact / different case / padded) is a benign success and never
  // creates a second row, without relying on a DB error.
  it("does not duplicate when the same game is added again (exact, case, padded)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    expect((await addUserGame({ game: "Stardew Valley" })).success).toBe(true);

    for (const variant of ["Stardew Valley", "stardew valley", "  Stardew Valley  "]) {
      mockedAuth.mockResolvedValueOnce(fakeSession(email));
      expect((await addUserGame({ game: variant })).success).toBe(true); // "already in your list"
    }

    const rows = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(rows.filter((r) => r.game.trim().toLowerCase() === "stardew valley")).toHaveLength(1);
  });

  // 043 (ADR 0016) US1/US3 -- DB backstop layer: two concurrent adds of the same
  // game can both pass the app-side check before either inserts; the unique index
  // + onConflictDoNothing keeps it to one row and neither call errors.
  it("tolerates a concurrent double-submit, leaving a single row (DB backstop)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    const [r1, r2] = await Promise.all([addUserGame({ game: "Nova Drift" }), addUserGame({ game: "Nova Drift" })]);
    expect(r1.success && r2.success).toBe(true);

    const rows = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(rows.filter((r) => r.game.trim().toLowerCase() === "nova drift")).toHaveLength(1);
  });
});

describe("removeUserGame", () => {
  it("removes a game the user owns", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    await addUserGame({ game: "Helldivers 2" });
    const [row] = await db
      .select()
      .from(userGames)
      .where(eq(userGames.game, "Helldivers 2"));

    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    const result = await removeUserGame(row.id);
    expect(result.success).toBe(true);

    const rows = await db.select().from(userGames).where(eq(userGames.id, row.id));
    expect(rows).toHaveLength(0);
  });

  it("rejects removing a game entry another user owns", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(email));
    await addUserGame({ game: "Catan" });
    const [row] = await db.select().from(userGames).where(eq(userGames.game, "Catan"));

    mockedAuth.mockResolvedValueOnce(fakeSession(otherEmail));
    const result = await removeUserGame(row.id);
    expect(result.success).toBe(false);

    const rows = await db.select().from(userGames).where(eq(userGames.id, row.id));
    expect(rows).toHaveLength(1);
  });
});
