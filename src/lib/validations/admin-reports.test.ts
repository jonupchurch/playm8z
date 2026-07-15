import { describe, expect, it } from "vitest";
import {
  banReportedUserSchema,
  dismissReportSchema,
  reportTargetIdParamSchema,
  reportTargetTypeParamSchema,
  resolveReportActionSchema,
  searchReportsQueueSchema,
} from "./admin-reports";

describe("searchReportsQueueSchema", () => {
  it("accepts every valid filter and defaults an invalid one to all", () => {
    for (const filter of ["all", "posting", "forum", "user", "message"]) {
      expect(searchReportsQueueSchema.parse({ filter }).filter).toBe(filter);
    }
    expect(searchReportsQueueSchema.parse({ filter: "bogus" }).filter).toBe("all");
    expect(searchReportsQueueSchema.parse({}).filter).toBe("all");
  });
});

describe("dismissReportSchema", () => {
  it("accepts a valid target type and id", () => {
    const result = dismissReportSchema.safeParse({ targetType: "message", targetId: crypto.randomUUID() });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid target type or a non-uuid id", () => {
    expect(dismissReportSchema.safeParse({ targetType: "bogus", targetId: crypto.randomUUID() }).success).toBe(false);
    expect(dismissReportSchema.safeParse({ targetType: "posting", targetId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("resolveReportActionSchema", () => {
  it("accepts remove/warn with an optional warning reason", () => {
    expect(resolveReportActionSchema.safeParse({ targetType: "posting", targetId: crypto.randomUUID(), resolution: "remove" }).success).toBe(
      true,
    );
    expect(
      resolveReportActionSchema.safeParse({
        targetType: "user",
        targetId: crypto.randomUUID(),
        resolution: "warn",
        warningReason: "repeat offense",
      }).success,
    ).toBe(true);
  });

  it("rejects a resolution outside remove/warn", () => {
    expect(
      resolveReportActionSchema.safeParse({ targetType: "posting", targetId: crypto.randomUUID(), resolution: "approve" }).success,
    ).toBe(false);
  });

  it("rejects a warning reason over 500 characters", () => {
    const result = resolveReportActionSchema.safeParse({
      targetType: "message",
      targetId: crypto.randomUUID(),
      resolution: "warn",
      warningReason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("banReportedUserSchema", () => {
  it("accepts a valid target type and id", () => {
    expect(banReportedUserSchema.safeParse({ targetType: "forum", targetId: crypto.randomUUID() }).success).toBe(true);
  });
});

describe("URL param schemas", () => {
  it("falls back to undefined for missing/invalid values, never throwing", () => {
    expect(reportTargetTypeParamSchema.parse(undefined)).toBeUndefined();
    expect(reportTargetTypeParamSchema.parse("bogus")).toBeUndefined();
    expect(reportTargetTypeParamSchema.parse("user")).toBe("user");
    expect(reportTargetIdParamSchema.parse("not-a-uuid")).toBeUndefined();
    const id = crypto.randomUUID();
    expect(reportTargetIdParamSchema.parse(id)).toBe(id);
  });
});
