import { describe, expect, it } from "vitest";
import { credentialsSchema, handleSchema, registerSchema } from "./auth";

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

describe("handleSchema", () => {
  it("accepts a handle starting with a letter, letters+numbers only", () => {
    expect(handleSchema.safeParse("player1").success).toBe(true);
  });

  it("accepts the maximum length of 24 characters", () => {
    expect(handleSchema.safeParse("a".repeat(24)).success).toBe(true);
  });

  it("rejects a handle starting with a number", () => {
    expect(handleSchema.safeParse("1player").success).toBe(false);
  });

  it("rejects a handle over 24 characters", () => {
    expect(handleSchema.safeParse("a".repeat(25)).success).toBe(false);
  });

  it("rejects a handle with non-alphanumeric characters", () => {
    expect(handleSchema.safeParse("player_1").success).toBe(false);
  });

  it("rejects an empty handle", () => {
    expect(handleSchema.safeParse("").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a valid handle, email, and password together", () => {
    const result = registerSchema.safeParse({
      handle: "player1",
      email: "player@example.com",
      password: "correcthorse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed handle even with a valid email/password", () => {
    const result = registerSchema.safeParse({
      handle: "1bad",
      email: "player@example.com",
      password: "correcthorse",
    });
    expect(result.success).toBe(false);
  });
});
