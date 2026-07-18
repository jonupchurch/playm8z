import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, reports, users } from "@/db/schema";
import { purgePolymorphicRefs } from "./purge-polymorphic-refs";

const runId = crypto.randomUUID().slice(0, 8);
let userId: string;
// A fictional target being hard-deleted (targetId has no FK, so no real row needed).
const targetId = crypto.randomUUID();

beforeAll(async () => {
  const [u] = await db
    .insert(users)
    .values({ email: `purge-${runId}@example.com`, handle: `purge${runId}` })
    .returning({ id: users.id });
  userId = u.id;
  await db.insert(likes).values({ userId, targetType: "thread", targetId });
  await db.insert(reports).values({ reporterId: userId, targetType: "thread", targetId, reason: "spam" });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId)); // cascades this user's likes + reports
});

describe("purgePolymorphicRefs", () => {
  it("purges disposable likes but preserves moderation reports for a hard-deleted target", async () => {
    await db.transaction(async (tx) => {
      await purgePolymorphicRefs(tx, "thread", targetId);
    });

    const remainingLikes = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.targetType, "thread"), eq(likes.targetId, targetId)));
    expect(remainingLikes).toHaveLength(0); // the like is gone

    const remainingReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.targetType, "thread"), eq(reports.targetId, targetId)));
    expect(remainingReports).toHaveLength(1); // the report is deliberately preserved
  });

  it("only touches the given target -- another target's like survives", async () => {
    const otherTarget = crypto.randomUUID();
    await db.insert(likes).values({ userId, targetType: "thread", targetId: otherTarget });

    await db.transaction(async (tx) => {
      await purgePolymorphicRefs(tx, "thread", targetId); // purge the FIRST target again
    });

    const survivor = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.targetType, "thread"), eq(likes.targetId, otherTarget)));
    expect(survivor).toHaveLength(1);
  });
});
