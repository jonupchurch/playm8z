import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, newsPosts, savedNewsPosts, users } from "@/db/schema";
import { computeReadTime, getNewsArticleBySlug, getNewsEngagement, getRelatedArticles } from "./get-news-article";

describe("computeReadTime", () => {
  it("computes ceil(wordCount / 200), floored at 1 minute", () => {
    expect(computeReadTime("one two three")).toBe(1);
    expect(computeReadTime(Array(200).fill("word").join(" "))).toBe(1);
    expect(computeReadTime(Array(201).fill("word").join(" "))).toBe(2);
    expect(computeReadTime(Array(450).fill("word").join(" "))).toBe(3);
  });

  it("never returns 0, even for empty content", () => {
    expect(computeReadTime("")).toBe(1);
    expect(computeReadTime("   ")).toBe(1);
  });
});

describe("getNewsArticleBySlug / getRelatedArticles (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const postIds: string[] = [];

  afterAll(async () => {
    for (const id of postIds) await db.delete(newsPosts).where(eq(newsPosts.id, id));
  });

  it("returns null for a nonexistent slug", async () => {
    const result = await getNewsArticleBySlug(`gna-missing-${runId}`);
    expect(result).toBeNull();
  });

  it("returns null for a draft post's slug", async () => {
    const [draft] = await db
      .insert(newsPosts)
      .values({ title: "Draft", excerpt: "e", category: "Announcement", status: "draft", slug: `gna-draft-${runId}`, body: "some real content here" })
      .returning({ id: newsPosts.id });
    postIds.push(draft.id);

    const result = await getNewsArticleBySlug(`gna-draft-${runId}`);
    expect(result).toBeNull();
  });

  it("returns null for a not-yet-due scheduled post's slug", async () => {
    const [future] = await db
      .insert(newsPosts)
      .values({
        title: "Future",
        excerpt: "e",
        category: "Announcement",
        status: "scheduled",
        publishedAt: new Date(Date.now() + 86_400_000),
        slug: `gna-future-${runId}`,
        body: "some real content here",
      })
      .returning({ id: newsPosts.id });
    postIds.push(future.id);

    const result = await getNewsArticleBySlug(`gna-future-${runId}`);
    expect(result).toBeNull();
  });

  it("returns the article for a published post, with a computed read time and real tags", async () => {
    const [published] = await db
      .insert(newsPosts)
      .values({
        title: "Published",
        excerpt: "e",
        category: "Announcement",
        status: "published",
        slug: `gna-published-${runId}`,
        body: Array(450).fill("word").join(" "),
        tags: ["launch", "beta"],
      })
      .returning({ id: newsPosts.id });
    postIds.push(published.id);

    const result = await getNewsArticleBySlug(`gna-published-${runId}`);
    expect(result).not.toBeNull();
    expect(result?.readTimeMinutes).toBe(3);
    expect(result?.tags).toEqual(["launch", "beta"]);
  });

  it("returns the article for a scheduled post whose publish date/time has passed", async () => {
    const [past] = await db
      .insert(newsPosts)
      .values({
        title: "Past scheduled",
        excerpt: "e",
        category: "Announcement",
        status: "scheduled",
        publishedAt: new Date(Date.now() - 60_000),
        slug: `gna-past-${runId}`,
        body: "some real content here",
      })
      .returning({ id: newsPosts.id });
    postIds.push(past.id);

    const result = await getNewsArticleBySlug(`gna-past-${runId}`);
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Past scheduled");
  });

  it("getRelatedArticles excludes the current post and any non-live post, most recent first", async () => {
    const now = Date.now();
    const [current] = await db
      .insert(newsPosts)
      .values({ title: "Current", excerpt: "e", category: "Announcement", status: "published", slug: `gna-rel-current-${runId}`, publishedAt: new Date(now) })
      .returning({ id: newsPosts.id });
    const [older] = await db
      .insert(newsPosts)
      .values({ title: "Older", excerpt: "e", category: "Announcement", status: "published", slug: `gna-rel-older-${runId}`, publishedAt: new Date(now - 60_000) })
      .returning({ id: newsPosts.id });
    const [newer] = await db
      .insert(newsPosts)
      .values({ title: "Newer", excerpt: "e", category: "Announcement", status: "published", slug: `gna-rel-newer-${runId}`, publishedAt: new Date(now + 60_000) })
      .returning({ id: newsPosts.id });
    const [draftRel] = await db
      .insert(newsPosts)
      .values({ title: "Draft related", excerpt: "e", category: "Announcement", status: "draft", slug: `gna-rel-draft-${runId}`, publishedAt: new Date(now + 120_000) })
      .returning({ id: newsPosts.id });
    postIds.push(current.id, older.id, newer.id, draftRel.id);

    const related = await getRelatedArticles(current.id);
    const relatedIds = related.map((post) => post.id);
    expect(relatedIds).not.toContain(current.id);
    expect(relatedIds).not.toContain(draftRel.id);
    expect(relatedIds).toContain(older.id);
    expect(relatedIds).toContain(newer.id);
    expect(relatedIds.indexOf(newer.id)).toBeLessThan(relatedIds.indexOf(older.id));
  });

  it("getNewsEngagement computes like count and the viewer's own liked/saved state", async () => {
    const [post] = await db
      .insert(newsPosts)
      .values({ title: "Engagement post", excerpt: "e", category: "Announcement", status: "published", slug: `gna-engagement-${runId}` })
      .returning({ id: newsPosts.id });
    postIds.push(post.id);

    const [viewer] = await db
      .insert(users)
      .values({ email: `gna-viewer-${runId}@example.com`, handle: `gnaviewer${runId}` })
      .returning({ id: users.id });
    const [other] = await db
      .insert(users)
      .values({ email: `gna-other-${runId}@example.com`, handle: `gnaother${runId}` })
      .returning({ id: users.id });

    await db.insert(likes).values([
      { userId: viewer.id, targetType: "newsPost", targetId: post.id },
      { userId: other.id, targetType: "newsPost", targetId: post.id },
    ]);
    await db.insert(savedNewsPosts).values({ userId: viewer.id, newsPostId: post.id });

    const viewerEngagement = await getNewsEngagement(post.id, viewer.id);
    expect(viewerEngagement.likeCount).toBe(2);
    expect(viewerEngagement.likedByViewer).toBe(true);
    expect(viewerEngagement.savedByViewer).toBe(true);

    const otherEngagement = await getNewsEngagement(post.id, other.id);
    expect(otherEngagement.likeCount).toBe(2);
    expect(otherEngagement.likedByViewer).toBe(true);
    expect(otherEngagement.savedByViewer).toBe(false);

    const loggedOutEngagement = await getNewsEngagement(post.id, null);
    expect(loggedOutEngagement.likeCount).toBe(2);
    expect(loggedOutEngagement.likedByViewer).toBe(false);
    expect(loggedOutEngagement.savedByViewer).toBe(false);

    await db.delete(likes).where(eq(likes.targetId, post.id));
    await db.delete(savedNewsPosts).where(eq(savedNewsPosts.newsPostId, post.id));
    await db.delete(users).where(eq(users.id, viewer.id));
    await db.delete(users).where(eq(users.id, other.id));
  });
});
