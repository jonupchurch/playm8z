import { describe, expect, it } from "vitest";
import { postingAgeLabel, POSTING_AGE_GROUPS } from "./age-label";

describe("postingAgeLabel", () => {
  it("labels every offered value", () => {
    expect(postingAgeLabel("any")).toBe("Any");
    expect(postingAgeLabel("18-29")).toBe("18-29");
    expect(postingAgeLabel("30-49")).toBe("30-49");
    expect(postingAgeLabel("50plus")).toBe("50+");
  });

  // The whole reason this module exists. Age used to render as
  // `${ageGroup}+`, which silently produces these -- no error, no failing
  // type check, just a page that looks wrong.
  it("never produces the mangled forms the old concatenation would", () => {
    const rendered = POSTING_AGE_GROUPS.map(postingAgeLabel);
    expect(rendered).not.toContain("50plus+");
    expect(rendered).not.toContain("50++");
    expect(rendered).not.toContain("30-49+");
    expect(rendered).not.toContain("any+");
  });

  // FR-012. No UI can produce these any more, so they'd regress
  // unnoticed -- a posting from before ADR 0009 must still read legibly
  // for the <=30 days before it expires (ADR 0003).
  it("still labels the legacy values a pre-ADR-0009 posting holds", () => {
    expect(postingAgeLabel("18")).toBe("18+");
    expect(postingAgeLabel("21")).toBe("21+");
  });

  // FR-009: a page must never 500 over a label.
  it("returns an unknown value as-is rather than throwing", () => {
    expect(postingAgeLabel("13")).toBe("13");
    expect(postingAgeLabel("")).toBe("");
    expect(postingAgeLabel("nonsense")).toBe("nonsense");
  });

  it("offers exactly four values, with `any` first as the default", () => {
    expect(POSTING_AGE_GROUPS).toEqual(["any", "18-29", "30-49", "50plus"]);
  });
});
