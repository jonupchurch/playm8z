import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/steam/steam-client", () => ({
  getOwnedGames: vi.fn(),
  getRecentlyPlayedAppIds: vi.fn(),
}));

const { auth } = await import("@/auth");
const steamClient = await import("@/lib/steam/steam-client");
const { importSteamGames, readSteamLibrary } = await import("./steam-import");
const { disconnectSteam } = await import("./steam-disconnect");

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockOwned = steamClient.getOwnedGames as unknown as ReturnType<typeof vi.fn>;
const mockRecent = steamClient.getRecentlyPlayedAppIds as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `steam-import-${runId}@example.com`;
const steamId = `steamimport-${runId}`;
let userId: string;

const fakeSession = () => ({ user: { email }, expires: new Date(Date.now() + 60_000).toISOString() });

beforeEach(async () => {
  if (!userId) {
    const [u] = await db.insert(users).values({ email, handle: `steamimport${runId}`, steamId }).returning({ id: users.id });
    userId = u.id;
  }
  // Reset to a clean connected state before each test.
  await db.delete(userGames).where(eq(userGames.userId, userId));
  await db.update(users).set({ steamId, steamConnectedAt: new Date() }).where(eq(users.id, userId));
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.delete(userGames).where(eq(userGames.userId, userId));
  await db.delete(users).where(eq(users.email, email));
});

describe("importSteamGames", () => {
  it("adds only new games, augmenting existing, storing playtime, no duplicates", async () => {
    await db.insert(userGames).values({ userId, game: "Existing Game" });

    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await importSteamGames([
      { name: "Counter-Strike 2", hoursPlayed: 100 },
      { name: "existing game", hoursPlayed: 50 }, // dup of the hand-added one (normalized) -> skip
      { name: "Dota 2", hoursPlayed: 20 },
      { name: "Dota 2", hoursPlayed: 20 }, // dup within the selection -> skip
    ]);
    expect(result).toEqual({ success: true, added: 2 });

    const rows = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(rows.map((r) => r.game).sort()).toEqual(["Counter-Strike 2", "Dota 2", "Existing Game"]);
    expect(rows.find((r) => r.game === "Counter-Strike 2")!.hoursPlayed).toBe(100);
    // The hand-added game is left untouched (no hours overwrite).
    expect(rows.find((r) => r.game === "Existing Game")!.hoursPlayed).toBeNull();
  });

  it("re-import adds nothing already present and never overwrites (idempotent)", async () => {
    await db.insert(userGames).values({ userId, game: "Rust", hoursPlayed: 10 });
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await importSteamGames([{ name: "Rust", hoursPlayed: 999 }]);
    expect(result).toEqual({ success: true, added: 0 });
    const [row] = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(row.hoursPlayed).toBe(10);
  });

  it("refuses when Steam isn't connected", async () => {
    await db.update(users).set({ steamId: null }).where(eq(users.id, userId));
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await importSteamGames([{ name: "X", hoursPlayed: 1 }]);
    expect(result.success).toBe(false);
  });
});

describe("readSteamLibrary", () => {
  it("returns a merged list for a public library", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    mockOwned.mockResolvedValueOnce([{ appid: 730, name: "Counter-Strike 2", playtimeMinutes: 6000 }]);
    mockRecent.mockResolvedValueOnce(new Set([730]));
    const result = await readSteamLibrary();
    expect(result.kind).toBe("list");
    if (result.kind === "list") {
      expect(result.items[0].name).toBe("Counter-Strike 2");
      expect(result.items[0].recentlyPlayed).toBe(true);
    }
  });

  it("reports a private library (null owned games)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    mockOwned.mockResolvedValueOnce(null);
    mockRecent.mockResolvedValueOnce(new Set());
    expect((await readSteamLibrary()).kind).toBe("private");
  });

  it("reports empty for a public-but-gameless library", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    mockOwned.mockResolvedValueOnce([]);
    mockRecent.mockResolvedValueOnce(new Set());
    expect((await readSteamLibrary()).kind).toBe("empty");
  });

  it("reports steam-unavailable when the client throws", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    mockOwned.mockRejectedValueOnce(new Error("boom"));
    mockRecent.mockResolvedValueOnce(new Set());
    expect((await readSteamLibrary()).kind).toBe("steam-unavailable");
  });

  it("reports not-connected when there's no linked SteamID", async () => {
    await db.update(users).set({ steamId: null }).where(eq(users.id, userId));
    mockedAuth.mockResolvedValueOnce(fakeSession());
    expect((await readSteamLibrary()).kind).toBe("not-connected");
  });
});

describe("disconnectSteam", () => {
  it("clears the link but keeps imported games", async () => {
    await db.insert(userGames).values({ userId, game: "Kept Game" });
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await disconnectSteam();

    const [u] = await db.select({ steamId: users.steamId, at: users.steamConnectedAt }).from(users).where(eq(users.id, userId));
    expect(u.steamId).toBeNull();
    expect(u.at).toBeNull();
    const games = await db.select().from(userGames).where(eq(userGames.userId, userId));
    expect(games).toHaveLength(1);
  });
});
