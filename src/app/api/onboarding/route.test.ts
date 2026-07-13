import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { POST } = await import("./route");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `onboarding-${runId}@example.com`;

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await db.insert(users).values({ email });
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
});
