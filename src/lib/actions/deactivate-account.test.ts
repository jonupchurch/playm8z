import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { reactivateOnSignIn } from "@/lib/auth/reactivate-on-sign-in";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { deactivateAccount } = await import("./deactivate-account");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const email = `deactivate-account-${runId}@example.com`;
let userId: string;

function fakeSession() {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, handle: `deactivateaccount${runId}` })
    .returning({ id: users.id });
  userId = user.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
});

describe("deactivateAccount", () => {
  it("sets deactivatedAt to a real timestamp", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession());
    const result = await deactivateAccount();
    expect(result.success).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.deactivatedAt).not.toBeNull();
  });

  it("reactivateOnSignIn (src/auth.ts's signIn callback logic) clears deactivatedAt again", async () => {
    await reactivateOnSignIn(userId);

    const [row] = await db.select().from(users).where(eq(users.id, userId));
    expect(row.deactivatedAt).toBeNull();
  });

  it("reactivateOnSignIn is a harmless no-op when deactivatedAt is already null", async () => {
    await reactivateOnSignIn(userId);
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    expect(row.deactivatedAt).toBeNull();
  });
});
