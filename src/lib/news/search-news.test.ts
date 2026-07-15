import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { searchNews } from "./search-news";

describe("searchNews (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const featuredTitle = `Featured beta launch ${runId}`;
  const postIds: string[] = [];
  let featuredId: string;

  beforeAll(async () => {
    // searchNews() queries the whole `newsPosts` table with no
    // per-test scoping (unlike a feature keyed by userId/postingId) --
    // clear it first so exact-count/pagination assertions below aren't
    // at the mercy of whatever else already exists (Home's own
    // getTrending() test hit this same class of bug first).
    await db.delete(newsPosts);

    const now = Date.now();

    const [featured] = await db
      .insert(newsPosts)
      .values({
        title: featuredTitle,
        excerpt: "The big one everyone's been waiting for.",
        category: "Announcement",
        featured: true,
        status: "published",
        publishedAt: new Date(now),
        slug: `sn-featured-${runId}`,
      })
      .returning({ id: newsPosts.id });
    featuredId = featured.id;
    postIds.push(featuredId);

    const rest = [
      { title: `Second announcement ${runId}`, category: "Announcement", offset: 1 },
      { title: `Update one ${runId}`, category: "Update", offset: 2 },
      {
        title: `Community fest ${runId}`,
        category: "Event",
        upcoming: true,
        offset: 3,
      },
      { title: `Update two ${runId}`, category: "Update", offset: 4 },
      { title: `Party of the month ${runId}`, category: "Community", offset: 5 },
      { title: `Patch v1 ${runId}`, category: "Patch Notes", offset: 6 },
      { title: `Patch v2 ${runId}`, category: "Patch Notes", offset: 7 },
    ];

    for (const post of rest) {
      const [row] = await db
        .insert(newsPosts)
        .values({
          title: post.title,
          excerpt: `Excerpt for ${post.title}`,
          category: post.category,
          upcoming: post.upcoming ?? false,
          status: "published",
          publishedAt: new Date(now - post.offset * 60_000),
          slug: `sn-rest-${post.offset}-${runId}`,
        })
        .returning({ id: newsPosts.id });
      postIds.push(row.id);
    }
  });

  afterAll(async () => {
    for (const id of postIds) {
      await db.delete(newsPosts).where(eq(newsPosts.id, id));
    }
  });

  it("shows the featured post separately and excludes it from the grid, with no filter/search active", async () => {
    const result = await searchNews({ category: "all", q: "", page: 1 });
    expect(result.featured?.title).toBe(featuredTitle);
    expect(result.posts.some((post) => post.id === featuredId)).toBe(false);
  });

  it("hides the featured section and folds the featured post into results when a category filter is active", async () => {
    const result = await searchNews({ category: "Announcement", q: "", page: 1 });
    expect(result.featured).toBeNull();
    expect(result.posts.some((post) => post.id === featuredId)).toBe(true);
    expect(result.posts.every((post) => post.category === "Announcement")).toBe(true);
  });

  it("hides the featured section and folds the featured post into results when a search is active", async () => {
    const result = await searchNews({ category: "all", q: featuredTitle, page: 1 });
    expect(result.featured).toBeNull();
    expect(result.posts.some((post) => post.id === featuredId)).toBe(true);
  });

  it("combines category and search with AND semantics", async () => {
    const result = await searchNews({ category: "Update", q: "one", page: 1 });
    expect(result.posts.every((post) => post.category === "Update")).toBe(true);
    expect(result.posts.some((post) => post.title.includes("Update one"))).toBe(true);
    expect(result.posts.some((post) => post.title.includes("Update two"))).toBe(false);
  });

  it("paginates cumulatively: page 1 caps at the page size with hasMore true, page 2 returns everything", async () => {
    const page1 = await searchNews({ category: "all", q: "", page: 1 });
    expect(page1.posts.length).toBe(6);
    expect(page1.hasMore).toBe(true);

    const page2 = await searchNews({ category: "all", q: "", page: 2 });
    expect(page2.posts.length).toBe(7);
    expect(page2.hasMore).toBe(false);
  });

  it("returns no featured post and no results for a filter/search combination matching nothing", async () => {
    const result = await searchNews({ category: "Event", q: "zzz-no-match", page: 1 });
    expect(result.featured).toBeNull();
    expect(result.posts).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  // Admin News (020, research.md #3): a post is only actually live when
  // published, or scheduled with a publish date/time that has passed --
  // computed at read time, no background job involved.
  it("excludes a draft post from the public feed", async () => {
    const [draft] = await db
      .insert(newsPosts)
      .values({
        title: `Draft post ${runId}`,
        excerpt: "e",
        category: "Announcement",
        status: "draft",
        publishedAt: new Date(Date.now()),
        slug: `sn-draft-${runId}`,
      })
      .returning({ id: newsPosts.id });
    postIds.push(draft.id);

    const result = await searchNews({ category: "all", q: "", page: 2 });
    expect(result.posts.some((post) => post.id === draft.id)).toBe(false);
  });

  it("excludes a scheduled post whose publish date/time hasn't passed yet", async () => {
    const [future] = await db
      .insert(newsPosts)
      .values({
        title: `Future scheduled post ${runId}`,
        excerpt: "e",
        category: "Announcement",
        status: "scheduled",
        publishedAt: new Date(Date.now() + 7 * 86_400_000),
        slug: `sn-future-${runId}`,
      })
      .returning({ id: newsPosts.id });
    postIds.push(future.id);

    const result = await searchNews({ category: "all", q: "", page: 2 });
    expect(result.posts.some((post) => post.id === future.id)).toBe(false);
  });

  it("includes a scheduled post whose publish date/time has already passed", async () => {
    const [past] = await db
      .insert(newsPosts)
      .values({
        title: `Past scheduled post ${runId}`,
        excerpt: "e",
        category: "Announcement",
        status: "scheduled",
        publishedAt: new Date(Date.now() - 60_000),
        slug: `sn-past-${runId}`,
      })
      .returning({ id: newsPosts.id });
    postIds.push(past.id);

    const result = await searchNews({ category: "Announcement", q: "", page: 1 });
    expect(result.posts.some((post) => post.id === past.id)).toBe(true);
  });

  it("never shows a featured post that isn't itself live", async () => {
    const [draftFeatured] = await db
      .insert(newsPosts)
      .values({
        title: `Draft featured post ${runId}`,
        excerpt: "e",
        category: "Announcement",
        status: "draft",
        featured: true,
        publishedAt: new Date(Date.now()),
        slug: `sn-draft-featured-${runId}`,
      })
      .returning({ id: newsPosts.id });
    postIds.push(draftFeatured.id);

    const result = await searchNews({ category: "all", q: "", page: 1 });
    expect(result.featured?.id).not.toBe(draftFeatured.id);
    // The real published `featured` row from beforeAll still wins.
    expect(result.featured?.id).toBe(featuredId);

    await db.update(newsPosts).set({ featured: false }).where(eq(newsPosts.id, draftFeatured.id));
  });
});
