import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { POST } = await import("./route");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `onboarding-${runId}@example.com`;
let userId: string;

function fakeSession() {
  return { user: { email }, expires: new Date(Date.now() + 1000 * 60).toISOString() };
}

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  const [u] = await db.insert(users).values({ email }).returning({ id: users.id });
  userId = u.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("POST /api/onboarding", () => {
  it("returns 401 without a session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const res = await POST(request({ name: "Mara" }));
    expect(res.status).toBe(401);
  });

  it("persists a partial patch and echoes the full profile, excluding passwordHash", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { email },
      expires: new Date(Date.now() + 1000 * 60).toISOString(),
    });

    const res = await POST(request({ name: "Mara", avatarColor: "amber-orange" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Mara");
    expect(data.avatarColor).toBe("amber-orange");
    expect(data.passwordHash).toBeUndefined();

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row?.name).toBe("Mara");
  });

  it("rejects an invalid ageGroup with 400", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { email },
      expires: new Date(Date.now() + 1000 * 60).toISOString(),
    });

    const res = await POST(request({ ageGroup: "13" }));
    expect(res.status).toBe(400);
  });

  it("reconciles onboarding games into userGames, not users.gamesPlayed (042)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const res = await POST(request({ gamesPlayed: ["Valorant", "valorant", "CS2"] }));
    const data = await res.json();
    expect(res.status).toBe(200);
    // Response reflects userGames, deduped by normalized name.
    expect([...data.gamesPlayed].sort()).toEqual(["CS2", "Valorant"]);

    // userGames holds exactly the deduped set.
    const ug = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, userId));
    expect(ug.map((g) => g.game).sort()).toEqual(["CS2", "Valorant"]);
  });

  it("removes a de-selected game on a follow-up patch (042)", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const res = await POST(request({ gamesPlayed: ["Valorant"] }));
    expect(res.status).toBe(200);

    const ug = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, userId));
    expect(ug.map((g) => g.game)).toEqual(["Valorant"]);
  });
});
