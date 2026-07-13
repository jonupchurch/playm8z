import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";
import { getForumStats } from "./get-forum-stats";

describe("getForumStats (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `forum-stats-${runId}@example.com`;
  let authorId: string;

  beforeAll(async () => {
    // memberCount/threadCount/trendingTags all aggregate over the
    // whole table -- clear forumThreads first, same isolation fix as
    // get-trending.test.ts/search-threads.test.ts. `users` is left
    // alone (shared by every other feature's own tests); memberCount
    // is asserted as "at least" rather than an exact number.
    await db.delete(forumThreads);

    const [author] = await db
      .insert(users)
      .values({ email, handle: `forumstats${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    await db.insert(forumThreads).values([
      { authorId, categoryId: "general", title: "t1", body: "b1", tags: ["valorant", "meta"] },
      { authorId, categoryId: "lfg", title: "t2", body: "b2", tags: ["valorant", "na-west"] },
      { authorId, categoryId: "gametalk", title: "t3", body: "b3", tags: ["meta"] },
    ]);
  });

  afterAll(async () => {
    await db.delete(forumThreads).where(eq(forumThreads.authorId, authorId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("returns an accurate thread count and a member count of at least 1", async () => {
    const stats = await getForumStats();
    expect(stats.threadCount).toBe(3);
    expect(stats.memberCount).toBeGreaterThanOrEqual(1);
  });

  it("returns trending tags ordered by frequency", async () => {
    const stats = await getForumStats();
    expect(stats.trendingTags[0]).toBe("valorant");
    expect(stats.trendingTags).toContain("meta");
    expect(stats.trendingTags).toContain("na-west");
  });
});
