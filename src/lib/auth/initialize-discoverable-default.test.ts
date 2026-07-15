import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { invalidateSettingsCache } from "@/lib/settings/get-settings";
import { initializeDiscoverableDefault } from "./initialize-discoverable-default";

const runId = crypto.randomUUID().slice(0, 8);
const email = `init-discoverable-${runId}@example.com`;
let userId: string;

async function setDiscoverableByDefault(value: boolean) {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await db.insert(settings).values({ discoverableByDefault: value });
  } else {
    await db.update(settings).set({ discoverableByDefault: value }).where(eq(settings.id, row.id));
  }
  invalidateSettingsCache();
}

beforeEach(async () => {
  const [user] = await db.insert(users).values({ email, privacyDiscoverable: true }).returning({ id: users.id });
  userId = user.id;
});

afterEach(async () => {
  await db.delete(users).where(eq(users.email, email));
});

afterAll(async () => {
  await setDiscoverableByDefault(true);
});

describe("initializeDiscoverableDefault", () => {
  it("sets privacyDiscoverable to true when the platform default is true", async () => {
    await setDiscoverableByDefault(true);
    await initializeDiscoverableDefault(userId);
    const [row] = await db.select({ privacyDiscoverable: users.privacyDiscoverable }).from(users).where(eq(users.id, userId));
    expect(row.privacyDiscoverable).toBe(true);
  });

  it("sets privacyDiscoverable to false when the platform default is false", async () => {
    await setDiscoverableByDefault(false);
    await initializeDiscoverableDefault(userId);
    const [row] = await db.select({ privacyDiscoverable: users.privacyDiscoverable }).from(users).where(eq(users.id, userId));
    expect(row.privacyDiscoverable).toBe(false);
  });
});
