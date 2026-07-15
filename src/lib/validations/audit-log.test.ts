import { describe, expect, it } from "vitest";
import { searchAuditLogSchema } from "./audit-log";

describe("searchAuditLogSchema", () => {
  it("defaults every field when the raw params object is empty", () => {
    const result = searchAuditLogSchema.parse({});
    expect(result).toEqual({ q: "", actor: "all", category: "all", page: 1 });
  });

  it("accepts a valid full set of filters", () => {
    const actorId = crypto.randomUUID();
    const result = searchAuditLogSchema.parse({ q: "banned", actor: actorId, category: "moderation", page: "3" });
    expect(result).toEqual({ q: "banned", actor: actorId, category: "moderation", page: 3 });
  });

  it("accepts the 'system' actor sentinel", () => {
    expect(searchAuditLogSchema.parse({ actor: "system" }).actor).toBe("system");
  });

  it("degrades a garbage actor value to 'all' instead of reaching a uuid comparison", () => {
    expect(searchAuditLogSchema.parse({ actor: "'; DROP TABLE users;--" }).actor).toBe("all");
  });

  it("degrades an invalid category to 'all'", () => {
    expect(searchAuditLogSchema.parse({ category: "nonsense" }).category).toBe("all");
  });

  it("degrades an invalid page to 1", () => {
    expect(searchAuditLogSchema.parse({ page: "0" }).page).toBe(1);
    expect(searchAuditLogSchema.parse({ page: "not-a-number" }).page).toBe(1);
  });
});
