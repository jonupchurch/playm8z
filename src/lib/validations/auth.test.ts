import { describe, expect, it } from "vitest";
import { credentialsSchema } from "./auth";

describe("credentialsSchema", () => {
  it("accepts a valid email and an 8+ character password", () => {
    const result = credentialsSchema.safeParse({
      email: "player@example.com",
      password: "correcthorse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = credentialsSchema.safeParse({
      email: "not-an-email",
      password: "correcthorse",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = credentialsSchema.safeParse({
      email: "player@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = credentialsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
