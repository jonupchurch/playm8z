import { describe, expect, it } from "vitest";
import {
  removeUserContentSchema,
  searchAdminUsersSchema,
  toggleUserBanSchema,
} from "./admin-users";

describe("searchAdminUsersSchema", () => {
  it("defaults q to empty string and status to 'all'", () => {
    const result = searchAdminUsersSchema.parse({});
    expect(result).toEqual({ q: "", status: "all" });
  });

  it("accepts a valid status filter", () => {
    const result = searchAdminUsersSchema.parse({ status: "flagged" });
    expect(result.status).toBe("flagged");
  });

  it("falls back to 'all' for an invalid status rather than throwing", () => {
    const result = searchAdminUsersSchema.parse({ status: "bogus" });
    expect(result.status).toBe("all");
  });
});

describe("toggleUserBanSchema", () => {
  it("accepts a valid uuid", () => {
    const userId = crypto.randomUUID();
    expect(toggleUserBanSchema.parse({ userId })).toEqual({ userId });
  });

  it("rejects a non-uuid userId", () => {
    expect(() => toggleUserBanSchema.parse({ userId: "not-a-uuid" })).toThrow();
  });
});

describe("removeUserContentSchema", () => {
  it("accepts a valid posting removal", () => {
    const contentId = crypto.randomUUID();
    expect(removeUserContentSchema.parse({ contentType: "posting", contentId })).toEqual({
      contentType: "posting",
      contentId,
    });
  });

  it("accepts a valid forumThread removal", () => {
    const contentId = crypto.randomUUID();
    expect(removeUserContentSchema.parse({ contentType: "forumThread", contentId })).toEqual({
      contentType: "forumThread",
      contentId,
    });
  });

  it("rejects an invalid contentType", () => {
    expect(() =>
      removeUserContentSchema.parse({ contentType: "reply", contentId: crypto.randomUUID() }),
    ).toThrow();
  });
});
