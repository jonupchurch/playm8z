import { describe, expect, it } from "vitest";
import {
  postReplySchema,
  replySortSchema,
  reportForumContentSchema,
  toggleLikeSchema,
  toggleSubscriptionSchema,
} from "./forum-thread";

const threadId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const replyId = "4fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("postReplySchema", () => {
  it("accepts a minimal valid reply", () => {
    const result = postReplySchema.parse({ threadId, body: "Great point." });
    expect(result.quotedReplyId).toBeUndefined();
  });

  it("accepts a quoted reply", () => {
    const result = postReplySchema.parse({ threadId, body: "Counterpoint.", quotedReplyId: replyId });
    expect(result.quotedReplyId).toBe(replyId);
  });

  it("rejects an empty body", () => {
    expect(() => postReplySchema.parse({ threadId, body: "" })).toThrow();
  });

  it("rejects a body over 3000 characters", () => {
    expect(() => postReplySchema.parse({ threadId, body: "a".repeat(3001) })).toThrow();
  });

  it("rejects a non-uuid threadId", () => {
    expect(() => postReplySchema.parse({ threadId: "not-a-uuid", body: "x" })).toThrow();
  });
});

describe("toggleLikeSchema", () => {
  it("accepts a thread target", () => {
    const result = toggleLikeSchema.parse({ targetType: "thread", targetId: threadId });
    expect(result.targetType).toBe("thread");
  });

  it("accepts a reply target", () => {
    const result = toggleLikeSchema.parse({ targetType: "reply", targetId: replyId });
    expect(result.targetType).toBe("reply");
  });

  it("rejects an invalid targetType", () => {
    expect(() => toggleLikeSchema.parse({ targetType: "bogus", targetId: threadId })).toThrow();
  });
});

describe("reportForumContentSchema", () => {
  it("accepts a valid uuid target", () => {
    const result = reportForumContentSchema.parse({ targetId: replyId });
    expect(result.targetId).toBe(replyId);
  });

  it("rejects a non-uuid target", () => {
    expect(() => reportForumContentSchema.parse({ targetId: "not-a-uuid" })).toThrow();
  });
});

describe("toggleSubscriptionSchema", () => {
  it("accepts a valid threadId", () => {
    const result = toggleSubscriptionSchema.parse({ threadId });
    expect(result.threadId).toBe(threadId);
  });
});

describe("replySortSchema", () => {
  it("defaults to top for missing/invalid input", () => {
    expect(replySortSchema.parse(undefined)).toBe("top");
    expect(replySortSchema.parse("bogus")).toBe("top");
  });

  it("accepts new and old", () => {
    expect(replySortSchema.parse("new")).toBe("new");
    expect(replySortSchema.parse("old")).toBe("old");
  });
});
