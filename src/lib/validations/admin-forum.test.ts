import { describe, expect, it } from "vitest";
import {
  banForumAuthorSchema,
  forumTargetIdParamSchema,
  forumTargetTypeParamSchema,
  resolveForumReportSchema,
  searchForumQueueSchema,
} from "./admin-forum";

describe("searchForumQueueSchema", () => {
  it("defaults to 'all' for a missing/invalid filter", () => {
    expect(searchForumQueueSchema.parse({})).toEqual({ filter: "all" });
    expect(searchForumQueueSchema.parse({ filter: "bogus" })).toEqual({ filter: "all" });
  });

  it("accepts each real filter value", () => {
    expect(searchForumQueueSchema.parse({ filter: "threads" })).toEqual({ filter: "threads" });
    expect(searchForumQueueSchema.parse({ filter: "replies" })).toEqual({ filter: "replies" });
    expect(searchForumQueueSchema.parse({ filter: "flagged" })).toEqual({ filter: "flagged" });
  });
});

describe("resolveForumReportSchema", () => {
  it("accepts a valid approve/remove/lock/warn input", () => {
    const id = crypto.randomUUID();
    expect(resolveForumReportSchema.safeParse({ targetType: "forumThread", targetId: id, resolution: "lock" }).success).toBe(true);
    expect(resolveForumReportSchema.safeParse({ targetType: "forumReply", targetId: id, resolution: "approve" }).success).toBe(true);
  });

  it("rejects an invalid targetType or resolution", () => {
    const id = crypto.randomUUID();
    expect(resolveForumReportSchema.safeParse({ targetType: "posting", targetId: id, resolution: "approve" }).success).toBe(false);
    expect(resolveForumReportSchema.safeParse({ targetType: "forumThread", targetId: id, resolution: "delete" }).success).toBe(false);
  });
});

describe("banForumAuthorSchema", () => {
  it("accepts a valid input", () => {
    expect(banForumAuthorSchema.safeParse({ targetType: "forumReply", targetId: crypto.randomUUID() }).success).toBe(true);
  });
});

describe("forum target param schemas", () => {
  it("fall back to undefined for missing/invalid values", () => {
    expect(forumTargetTypeParamSchema.parse(undefined)).toBeUndefined();
    expect(forumTargetTypeParamSchema.parse("bogus")).toBeUndefined();
    expect(forumTargetIdParamSchema.parse("not-a-uuid")).toBeUndefined();
  });

  it("pass through a valid value", () => {
    expect(forumTargetTypeParamSchema.parse("forumThread")).toBe("forumThread");
    const id = crypto.randomUUID();
    expect(forumTargetIdParamSchema.parse(id)).toBe(id);
  });
});
