import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyGoogleEmail } from "./verify-google-email";

const runId = crypto.randomUUID().slice(0, 8);
const email = `verify-google-${runId}@example.com`;
let userId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, handle: `verifygoogle${runId}` })
    .returning({ id: users.id });
  userId = user.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

describe("verifyGoogleEmail", () => {
  it("sets emailVerified for a previously-unverified account", async () => {
    const [before] = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.id, userId));
    expect(before.emailVerified).toBeNull();

    await verifyGoogleEmail(userId);

    const [after] = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.id, userId));
    expect(after.emailVerified).not.toBeNull();
  });
});
