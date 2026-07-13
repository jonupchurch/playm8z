import { describe, expect, it } from "vitest";
import { blockUserSchema, candidateSearchSchema } from "./blocking";

describe("candidateSearchSchema", () => {
  it("defaults to an empty query", () => {
    const result = candidateSearchSchema.parse({});
    expect(result.q).toBe("");
  });

  it("accepts a trimmed query", () => {
    const result = candidateSearchSchema.parse({ q: "  dane  " });
    expect(result.q).toBe("dane");
  });

  it("rejects a query over 100 characters", () => {
    expect(() => candidateSearchSchema.parse({ q: "a".repeat(101) })).toThrow();
  });
});

describe("blockUserSchema", () => {
  it("accepts a valid uuid target", () => {
    const result = blockUserSchema.parse({ blockedId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" });
    expect(result.alsoReport).toBe(false);
  });

  it("accepts alsoReport true", () => {
    const result = blockUserSchema.parse({
      blockedId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      alsoReport: true,
    });
    expect(result.alsoReport).toBe(true);
  });

  it("rejects a non-uuid target", () => {
    expect(() => blockUserSchema.parse({ blockedId: "not-a-uuid" })).toThrow();
  });
});
