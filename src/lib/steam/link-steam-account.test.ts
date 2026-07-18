import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { linkSteamAccount } from "./link-steam-account";

const runId = crypto.randomUUID().slice(0, 8);
const aEmail = `steam-link-a-${runId}@example.com`;
const bEmail = `steam-link-b-${runId}@example.com`;
const steamId = `steamlinktest-${runId}`;
let aId: string;
let bId: string;

beforeAll(async () => {
  const [a] = await db.insert(users).values({ email: aEmail, handle: `steamlinka${runId}` }).returning({ id: users.id });
  aId = a.id;
  const [b] = await db.insert(users).values({ email: bEmail, handle: `steamlinkb${runId}` }).returning({ id: users.id });
  bId = b.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, aEmail));
  await db.delete(users).where(eq(users.email, bEmail));
});

describe("linkSteamAccount", () => {
  it("links a SteamID to a user and records when", async () => {
    expect(await linkSteamAccount(aId, steamId)).toBe("linked");
    const [a] = await db.select({ steamId: users.steamId, at: users.steamConnectedAt }).from(users).where(eq(users.id, aId));
    expect(a.steamId).toBe(steamId);
    expect(a.at).toBeTruthy();
  });

  it("refuses a SteamID already linked to another account, changing nothing", async () => {
    expect(await linkSteamAccount(bId, steamId)).toBe("already-linked-elsewhere");
    const [b] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.id, bId));
    expect(b.steamId).toBeNull();
  });

  it("allows re-linking the same SteamID to the same user", async () => {
    expect(await linkSteamAccount(aId, steamId)).toBe("linked");
  });
});
