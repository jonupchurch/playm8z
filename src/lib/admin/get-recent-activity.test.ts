import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, users } from "@/db/schema";
import { getRecentActivity } from "./get-recent-activity";

// auditEntries is a brand-new table this feature introduces -- no
// other test file writes to it yet, so (unlike the shared user/
// postings/reports tables) it's safe to clear entirely rather than
// use a before/after delta, matching get-forum-stats.test.ts's own
// precedent for a table it owns outright.
describe("getRecentActivity (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `recent-activity-${runId}@example.com`;
  let actorId: string;

  beforeAll(async () => {
    await db.delete(auditEntries);
    const [actor] = await db
      .insert(users)
      .values({ email, handle: `recentactivity${runId}` })
      .returning({ id: users.id });
    actorId = actor.id;
  });

  afterAll(async () => {
    await db.delete(auditEntries);
    await db.delete(users).where(eq(users.id, actorId));
  });

  it("returns an empty state when no entries exist", async () => {
    const items = await getRecentActivity();
    expect(items).toEqual([]);
  });

  it("lists entries most-recent-first with actor/action/target", async () => {
    await db.insert(auditEntries).values([
      {
        actorId,
        action: "removed a posting",
        category: "moderation",
        targetLabel: "old entry",
        createdAt: new Date(Date.now() - 60_000),
      },
      {
        actorId,
        action: "locked a thread",
        category: "moderation",
        targetLabel: "new entry",
        createdAt: new Date(),
      },
    ]);

    const items = await getRecentActivity();
    expect(items).toHaveLength(2);
    expect(items[0].targetLabel).toBe("new entry");
    expect(items[0].actorHandle).toBe(`recentactivity${runId}`);
    expect(items[1].targetLabel).toBe("old entry");
  });
});
