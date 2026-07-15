import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const { auth } = await import("@/auth");
const { toggleFollow } = await import("./toggle-follow");
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

const runId = crypto.randomUUID().slice(0, 8);
const verifiedEmail = `follow-verified-${runId}@example.com`;
const unverifiedEmail = `follow-unverified-${runId}@example.com`;

let followerId: string;
let followeeId: string;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

beforeAll(async () => {
  const [follower] = await db
    .insert(users)
    .values({ email: verifiedEmail, handle: `followverified${runId}`, emailVerified: new Date() })
    .returning({ id: users.id });
  followerId = follower.id;

  await db.insert(users).values({ email: unverifiedEmail, handle: `followunverified${runId}` });

  const [followee] = await db
    .insert(users)
    .values({ email: `follow-followee-${runId}@example.com`, handle: `followfollowee${runId}` })
    .returning({ id: users.id });
  followeeId = followee.id;
});

afterAll(async () => {
  await db.delete(follows).where(eq(follows.followerId, followerId));
  await db.delete(users).where(eq(users.email, verifiedEmail));
  await db.delete(users).where(eq(users.email, unverifiedEmail));
  await db.delete(users).where(eq(users.id, followeeId));
});

describe("toggleFollow", () => {
  it("follows, creating a row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleFollow({ followeeId });
    expect(result).toEqual({ success: true, following: true });

    const [row] = await db.select().from(follows).where(eq(follows.followerId, followerId));
    expect(row).toBeDefined();
  });

  it("unfollows, deleting the row", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleFollow({ followeeId });
    expect(result).toEqual({ success: true, following: false });

    const rows = await db.select().from(follows).where(eq(follows.followerId, followerId));
    expect(rows).toEqual([]);
  });

  it("rejects following yourself", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(verifiedEmail));
    const result = await toggleFollow({ followeeId: followerId });
    expect(result.success).toBe(false);
  });

  it("blocks an unverified session", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession(unverifiedEmail));
    const result = await toggleFollow({ followeeId });
    expect(result.success).toBe(false);
  });

  it("blocks an unauthenticated visitor", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await toggleFollow({ followeeId });
    expect(result.success).toBe(false);
  });
});
