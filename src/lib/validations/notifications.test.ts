import { describe, expect, it } from "vitest";
import { markNotificationReadSchema, reportReasonEnum, submitReportSchema } from "./notifications";

const targetId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const notificationId = "4fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("reportReasonEnum", () => {
  it("accepts each documented reason", () => {
    for (const reason of ["spam", "harassment", "inappropriate", "underage", "impersonation", "other"]) {
      expect(reportReasonEnum.parse(reason)).toBe(reason);
    }
  });

  it("rejects an undocumented reason", () => {
    expect(() => reportReasonEnum.parse("libel")).toThrow();
  });
});

describe("submitReportSchema", () => {
  it("accepts a minimal report (no details, no block)", () => {
    const result = submitReportSchema.parse({ targetType: "posting", targetId, reason: "spam" });
    expect(result.alsoBlock).toBe(false);
    expect(result.details).toBeUndefined();
  });

  it("accepts details and alsoBlock", () => {
    const result = submitReportSchema.parse({
      targetType: "user",
      targetId,
      reason: "harassment",
      details: "Kept messaging after being asked to stop.",
      alsoBlock: true,
    });
    expect(result.details).toBe("Kept messaging after being asked to stop.");
    expect(result.alsoBlock).toBe(true);
  });

  it("trims details", () => {
    const result = submitReportSchema.parse({
      targetType: "forum",
      targetId,
      reason: "other",
      details: "  spacey  ",
    });
    expect(result.details).toBe("spacey");
  });

  it("rejects details over 1000 characters", () => {
    expect(() =>
      submitReportSchema.parse({ targetType: "message", targetId, reason: "other", details: "a".repeat(1001) }),
    ).toThrow();
  });

  it("rejects an invalid targetType", () => {
    expect(() => submitReportSchema.parse({ targetType: "posting-detail", targetId, reason: "spam" })).toThrow();
  });

  it("rejects a non-uuid targetId", () => {
    expect(() =>
      submitReportSchema.parse({ targetType: "posting", targetId: "not-a-uuid", reason: "spam" }),
    ).toThrow();
  });

  it("rejects a missing reason", () => {
    expect(() => submitReportSchema.parse({ targetType: "posting", targetId })).toThrow();
  });
});

describe("markNotificationReadSchema", () => {
  it("accepts a valid notificationId", () => {
    expect(markNotificationReadSchema.parse({ notificationId }).notificationId).toBe(notificationId);
  });

  it("rejects a non-uuid notificationId", () => {
    expect(() => markNotificationReadSchema.parse({ notificationId: "not-a-uuid" })).toThrow();
  });
});
