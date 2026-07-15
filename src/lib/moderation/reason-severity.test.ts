import { describe, expect, it } from "vitest";
import { computeSeverity, reasonLabel, reportReasonSeverity } from "./reason-severity";

describe("reportReasonSeverity", () => {
  it("ranks harassment and underage as high", () => {
    expect(reportReasonSeverity("harassment")).toBe("high");
    expect(reportReasonSeverity("underage")).toBe("high");
  });

  it("ranks spam, inappropriate, and impersonation as med", () => {
    expect(reportReasonSeverity("spam")).toBe("med");
    expect(reportReasonSeverity("inappropriate")).toBe("med");
    expect(reportReasonSeverity("impersonation")).toBe("med");
  });

  it("ranks other as low", () => {
    expect(reportReasonSeverity("other")).toBe("low");
  });
});

describe("reasonLabel", () => {
  it("maps every canonical reason to its display label", () => {
    expect(reasonLabel("spam")).toBe("Spam");
    expect(reasonLabel("harassment")).toBe("Harassment");
    expect(reasonLabel("inappropriate")).toBe("Inappropriate");
    expect(reasonLabel("underage")).toBe("Underage & safety");
    expect(reasonLabel("impersonation")).toBe("Impersonation");
    expect(reasonLabel("other")).toBe("Other");
  });

  it("falls back to Other for an unrecognized value", () => {
    expect(reasonLabel("scam")).toBe("Other");
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
