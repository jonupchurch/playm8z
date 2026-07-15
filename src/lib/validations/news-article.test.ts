import { describe, expect, it } from "vitest";
import { newsArticleTargetSchema } from "./news-article";

describe("newsArticleTargetSchema", () => {
  it("requires a valid uuid newsPostId", () => {
    expect(newsArticleTargetSchema.safeParse({ newsPostId: "not-a-uuid" }).success).toBe(false);
    expect(newsArticleTargetSchema.safeParse({ newsPostId: crypto.randomUUID() }).success).toBe(true);
  });
});
