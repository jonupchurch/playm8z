import { describe, expect, it } from "vitest";
import { computeSeverity, reportReasonSeverity } from "./posting-severity";

describe("reportReasonSeverity", () => {
  it("ranks harassment and underage as high", () => {
    expect(reportReasonSeverity("harassment")).toBe("high");
    expect(reportReasonSeverity("underage")).toBe("high");
  });

  it("ranks spam and inappropriate as med", () => {
    expect(reportReasonSeverity("spam")).toBe("med");
    expect(reportReasonSeverity("inappropriate")).toBe("med");
  });

  it("ranks other as low", () => {
    expect(reportReasonSeverity("other")).toBe("low");
  });
});

describe("computeSeverity", () => {
  it("is low with no reports and no auto-flag", () => {
    expect(computeSeverity([], null)).toBe("low");
  });

  it("takes the worst of multiple report reasons", () => {
    expect(computeSeverity(["other", "spam", "harassment"], null)).toBe("high");
    expect(computeSeverity(["other", "spam"], null)).toBe("med");
  });

  it("factors in the auto-flag reason's own severity", () => {
    expect(computeSeverity([], "phishing_or_scam")).toBe("high");
    expect(computeSeverity([], "boosting_service")).toBe("high");
    expect(computeSeverity([], "new_account_first_post")).toBe("low");
  });

  it("takes the worse of report severity and auto-flag severity", () => {
    expect(computeSeverity(["other"], "phishing_or_scam")).toBe("high");
    expect(computeSeverity(["harassment"], "new_account_first_post")).toBe("high");
  });
});
