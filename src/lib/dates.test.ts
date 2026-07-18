import { describe, expect, it } from "vitest";
import { isSameDay, startOfToday } from "./dates";

describe("startOfToday", () => {
  it("zeroes the time components (local midnight)", () => {
    const s = startOfToday();
    expect([s.getHours(), s.getMinutes(), s.getSeconds(), s.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });
});

describe("isSameDay", () => {
  it("is true for two times on the same calendar day", () => {
    expect(isSameDay(new Date(2026, 6, 18, 0, 0, 0), new Date(2026, 6, 18, 23, 59, 59))).toBe(true);
  });

  it("is false across a day boundary even when only hours apart", () => {
    expect(isSameDay(new Date(2026, 6, 18, 23, 0, 0), new Date(2026, 6, 19, 1, 0, 0))).toBe(false);
  });

  it("compares the full calendar date, not just day-of-month", () => {
    expect(isSameDay(new Date(2026, 6, 18), new Date(2026, 7, 18))).toBe(false); // diff month
    expect(isSameDay(new Date(2025, 6, 18), new Date(2026, 6, 18))).toBe(false); // diff year
  });
});
