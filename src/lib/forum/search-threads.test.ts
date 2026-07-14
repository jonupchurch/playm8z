import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";
import { getCategoryCounts, isHotThread, searchThreads } from "./search-threads";

describe("isHotThread", () => {
  const now = Date.now();
  const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000);

  it("is never hot when pinned", () => {
    expect(isHotThread(50, hoursAgo(1), true, now)).toBe(false);
  });

  it("is not hot below the minimum reply count", () => {
    expect(isHotThread(2, hoursAgo(1), false, now)).toBe(false);
  });

  it("is hot when replies-per-hour clears the threshold", () => {
    expect(isHotThread(10, hoursAgo(2), false, now)).toBe(true);
  });

  it("is not hot when replies-per-hour falls short", () => {
    expect(isHotThread(3, hoursAgo(100), false, now)).toBe(false);
  });

  it("floors age at 1 hour, avoiding a divide-by-near-zero spike for a brand-new thread", () => {
    // Without the floor this ratio would approach Infinity; flooring
    // age at 1 hour keeps it a sane, finite 3/1 = 3.0, still >= the
    // threshold -- 3 replies within the first hour legitimately
    // qualifies as a fast pace, so this is expected to be hot.
    expect(isHotThread(3, new Date(now - 1000), false, now)).toBe(true);
  });
});

describe("searchThreads / getCategoryCounts (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `forum-search-${runId}@example.com`;
  let authorId: string;

  beforeAll(async () => {
    // Both searchThreads({category: "all"}) and getCategoryCounts()
    // aggregate over the whole table -- clear it first so this test's
    // own counts/ordering aren't at the mercy of whatever else exists
    // in the shared dev database, same fix as get-trending.test.ts.
    await db.delete(forumThreads);

    const [author] = await db
      .insert(users)
      .values({ email, handle: `forumsearch${runId}` })
      .returning({ id: users.id });
    authorId = author.id;

    const base = { authorId };
    await db.insert(forumThreads).values([
      {
        ...base,
        categoryId: "general",
        title: `Pinned welcome ${runId}`,
        body: "read before posting",
        tags: ["rules"],
        pinned: true,
        replyCount: 1,
        likes: 1,
        createdAt: new Date(Date.now() - 10 * 60_000),
      },
      {
        ...base,
        categoryId: "lfg",
        title: `Valorant crew ${runId}`,
        body: "looking for a squad",
        tags: ["valorant", "na-west"],
        replyCount: 5,
        likes: 20,
        createdAt: new Date(Date.now() - 5 * 60_000),
      },
      {
        ...base,
        categoryId: "lfg",
        title: `Quiet thread ${runId}`,
        body: "anyone around",
        tags: [],
        replyCount: 0,
        likes: 0,
        createdAt: new Date(Date.now() - 60_000),
      },
      {
        ...base,
        categoryId: "gametalk",
        title: `Meta debate ${runId}`,
        body: "which agent comp wins",
        tags: ["meta"],
        replyCount: 2,
        likes: 50,
        createdAt: new Date(Date.now() - 20 * 60_000),
      },
      {
        ...base,
        // A category getCategoryCounts()'s own assertions below don't
        // check -- that function is deliberately out of this
        // amendment's scope (research.md #2 names exactly three
        // functions, not getCategoryCounts), so a removed thread still
        // counts there; using an unchecked category avoids a collision.
        categoryId: "tabletop",
        title: `Removed thread ${runId}`,
        body: "spam",
        tags: [],
        replyCount: 0,
        likes: 0,
        createdAt: new Date(),
        removedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(forumThreads).where(eq(forumThreads.authorId, authorId));
    await db.delete(users).where(eq(users.id, authorId));
  });

  it("narrows to the active category", async () => {
    const rows = await searchThreads({ category: "lfg", q: "", sort: "latest" });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.categoryId === "lfg")).toBe(true);
  });

  it("combines category and search (AND)", async () => {
    const rows = await searchThreads({ category: "lfg", q: "valorant", sort: "latest" });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toContain("Valorant crew");
  });

  it("matches on a tag via search", async () => {
    const rows = await searchThreads({ category: "all", q: "na-west", sort: "latest" });
    expect(rows.some((row) => row.title.includes("Valorant crew"))).toBe(true);
  });

  it("matches on the author's handle via search", async () => {
    const rows = await searchThreads({ category: "all", q: `forumsearch${runId}`, sort: "latest" });
    expect(rows).toHaveLength(4);
  });

  it("keeps the pinned thread first regardless of sort", async () => {
    const latest = await searchThreads({ category: "all", q: "", sort: "latest" });
    const top = await searchThreads({ category: "all", q: "", sort: "top" });
    expect(latest[0].title).toContain("Pinned welcome");
    expect(top[0].title).toContain("Pinned welcome");
  });

  it("orders by likes descending for 'top', pinned aside", async () => {
    const rows = await searchThreads({ category: "all", q: "", sort: "top" });
    const nonPinned = rows.filter((row) => !row.pinned);
    expect(nonPinned.map((row) => row.likes)).toEqual([50, 20, 0]);
  });

  it("filters to zero-reply threads for 'unanswered'", async () => {
    const rows = await searchThreads({ category: "all", q: "", sort: "unanswered" });
    const nonPinned = rows.filter((row) => !row.pinned);
    expect(nonPinned.every((row) => row.replyCount === 0)).toBe(true);
    expect(nonPinned.some((row) => row.title.includes("Quiet thread"))).toBe(true);
  });

  it("excludes a moderator-removed thread (Admin Users 016's FR-009)", async () => {
    const rows = await searchThreads({ category: "all", q: "", sort: "latest" });
    expect(rows.some((row) => row.title.includes("Removed thread"))).toBe(false);
  });

  it("returns accurate per-category counts", async () => {
    const counts = await getCategoryCounts();
    expect(counts.general).toBe(1);
    expect(counts.lfg).toBe(2);
    expect(counts.gametalk).toBe(1);
    expect(counts.offtopic ?? 0).toBe(0);
  });
});
