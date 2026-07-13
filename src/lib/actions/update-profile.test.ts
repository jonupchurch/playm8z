import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { updateProfile } = await import("./update-profile");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `update-profile-${runId}@example.com`;

function fakeSession() {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values({ email, handle: `updateprofile${runId}`, name: "Old Name" });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("updateProfile", () => {
  it("persists name, region, and bio", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await updateProfile({ name: "New Name", region: "eu-west", bio: "Hello there." });
    expect(result.success).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.name).toBe("New Name");
    expect(row.region).toBe("eu-west");
    expect(row.bio).toBe("Hello there.");
  });

  it("clears bio when omitted", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updateProfile({ name: "New Name", region: "eu-west", bio: "Set first" });
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updateProfile({ name: "New Name", region: "eu-west" });

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.bio).toBeNull();
  });

  it("rejects an empty name", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await updateProfile({ name: "  ", region: "eu-west" });
    expect(result.success).toBe(false);
  });

  it("never accepts or changes the handle", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updateProfile({ name: "New Name", region: "eu-west" });
    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.handle).toBe(`updateprofile${runId}`);
  });
});
