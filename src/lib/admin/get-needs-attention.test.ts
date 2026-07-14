import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { getNeedsAttention } from "./get-needs-attention";

describe("getNeedsAttention (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `needs-attention-${runId}@example.com`;
  let reporterId: string;
  const reportIds: string[] = [];

  afterAll(async () => {
    for (const id of reportIds) {
      await db.delete(reports).where(eq(reports.id, id));
    }
    await db.delete(users).where(eq(users.id, reporterId));
  });

  it("counts one open report per targetType, ignoring a non-open one", async () => {
    const [reporter] = await db
      .insert(users)
      .values({ email, handle: `needsattn${runId}` })
      .returning({ id: users.id });
    reporterId = reporter.id;

    const before = await getNeedsAttention();

    const inserted = await db
      .insert(reports)
      .values([
        { reporterId, targetType: "user", targetId: crypto.randomUUID(), status: "open" },
        { reporterId, targetType: "posting", targetId: crypto.randomUUID(), status: "open" },
        { reporterId, targetType: "forum", targetId: crypto.randomUUID(), status: "open" },
        // Resolved -- must not be counted.
        { reporterId, targetType: "user", targetId: crypto.randomUUID(), status: "resolved" },
      ])
      .returning({ id: reports.id });
    reportIds.push(...inserted.map((row) => row.id));

    const after = await getNeedsAttention();

    expect(after.userReports - before.userReports).toBe(1);
    expect(after.postingReview - before.postingReview).toBe(1);
    expect(after.forumReview - before.forumReview).toBe(1);
  });
});
