import { describe, expect, it } from "vitest";
import {
  banPostingAuthorSchema,
  resolvePostingReportSchema,
  searchPostingQueueSchema,
} from "./admin-postings";

describe("searchPostingQueueSchema", () => {
  it("defaults to 'all'", () => {
    expect(searchPostingQueueSchema.parse({})).toEqual({ filter: "all" });
  });

  it("accepts a valid filter", () => {
    expect(searchPostingQueueSchema.parse({ filter: "flagged" })).toEqual({ filter: "flagged" });
  });

  it("falls back to 'all' for an invalid filter rather than throwing", () => {
    expect(searchPostingQueueSchema.parse({ filter: "bogus" })).toEqual({ filter: "all" });
  });
});

describe("resolvePostingReportSchema", () => {
  it("accepts a valid approve/remove/warn input", () => {
    const postingId = crypto.randomUUID();
    expect(resolvePostingReportSchema.parse({ postingId, resolution: "approve" })).toEqual({
      postingId,
      resolution: "approve",
    });
    expect(resolvePostingReportSchema.parse({ postingId, resolution: "remove" }).resolution).toBe("remove");
    expect(
      resolvePostingReportSchema.parse({ postingId, resolution: "warn", warningReason: "spam" }).warningReason,
    ).toBe("spam");
  });

  it("rejects an invalid resolution", () => {
    expect(() =>
      resolvePostingReportSchema.parse({ postingId: crypto.randomUUID(), resolution: "bogus" }),
    ).toThrow();
  });

  it("rejects a non-uuid postingId", () => {
    expect(() => resolvePostingReportSchema.parse({ postingId: "not-a-uuid", resolution: "approve" })).toThrow();
  });
});

describe("banPostingAuthorSchema", () => {
  it("accepts a valid uuid", () => {
    const postingId = crypto.randomUUID();
    expect(banPostingAuthorSchema.parse({ postingId })).toEqual({ postingId });
  });

  it("rejects a non-uuid postingId", () => {
    expect(() => banPostingAuthorSchema.parse({ postingId: "not-a-uuid" })).toThrow();
  });
});
