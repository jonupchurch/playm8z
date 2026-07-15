import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { getNewsPosts } from "./get-news-posts";

describe("getNewsPosts (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const postIds: string[] = [];

  afterAll(async () => {
    for (const id of postIds) await db.delete(newsPosts).where(eq(newsPosts.id, id));
  });

  it("returns every post regardless of status, with the fields the list/editor need", async () => {
    const before = await getNewsPosts();

    const [draft] = await db
      .insert(newsPosts)
      .values({ title: `Draft post ${runId}`, excerpt: "e", body: "b", category: "Announcement", status: "draft" })
      .returning({ id: newsPosts.id });
    const [published] = await db
      .insert(newsPosts)
      .values({ title: `Published post ${runId}`, excerpt: "e", body: "b", category: "Update", status: "published", featured: true })
      .returning({ id: newsPosts.id });
    const [scheduled] = await db
      .insert(newsPosts)
      .values({
        title: `Scheduled post ${runId}`,
        excerpt: "e",
        body: "b",
        category: "Event",
        status: "scheduled",
        publishedAt: new Date(Date.now() + 86_400_000),
      })
      .returning({ id: newsPosts.id });
    postIds.push(draft.id, published.id, scheduled.id);

    const after = await getNewsPosts();
    expect(after.length - before.length).toBe(3);

    const draftRow = after.find((p) => p.id === draft.id)!;
    expect(draftRow.status).toBe("draft");
    expect(draftRow.body).toBe("b");

    const publishedRow = after.find((p) => p.id === published.id)!;
    expect(publishedRow.status).toBe("published");
    expect(publishedRow.featured).toBe(true);

    const scheduledRow = after.find((p) => p.id === scheduled.id)!;
    expect(scheduledRow.status).toBe("scheduled");
  });
});
