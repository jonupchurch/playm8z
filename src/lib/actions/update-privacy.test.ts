import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { updatePrivacy } = await import("./update-privacy");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `update-privacy-${runId}@example.com`;

function fakeSession() {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  await db.insert(users).values({ email, handle: `updateprivacy${runId}` });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("updatePrivacy", () => {
  it("persists each toggle independently", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updatePrivacy("privacyShowAge", false);

    let [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.privacyShowAge).toBe(false);
    expect(row.privacyShowRegion).toBe(true);

    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updatePrivacy("privacyDiscoverable", false);

    [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.privacyShowAge).toBe(false); // unchanged by the second call
    expect(row.privacyDiscoverable).toBe(false);
  });

  it("toggles privacyShowOnline and privacyShowRegion independently", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updatePrivacy("privacyShowOnline", false);
    mockedAuth.mockResolvedValueOnce(fakeSession());
    await updatePrivacy("privacyShowRegion", false);

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.privacyShowOnline).toBe(false);
    expect(row.privacyShowRegion).toBe(false);
  });
});
