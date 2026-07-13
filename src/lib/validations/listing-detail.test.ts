import { describe, expect, it } from "vitest";
import { applyMessageSchema, questionTextSchema, replyTextSchema } from "./listing-detail";

describe("applyMessageSchema", () => {
  it("accepts an absent message", () => {
    const result = applyMessageSchema.parse({});
    expect(result.message).toBeUndefined();
  });

  it("accepts a message within the 500-char cap", () => {
    const result = applyMessageSchema.parse({ message: "Hi, I'd love to join!" });
    expect(result.message).toBe("Hi, I'd love to join!");
  });

  it("rejects a message over 500 characters", () => {
    expect(() => applyMessageSchema.parse({ message: "a".repeat(501) })).toThrow();
  });
});

describe("questionTextSchema", () => {
  it("accepts a non-empty question", () => {
    const result = questionTextSchema.parse({ text: "What rank are the current members?" });
    expect(result.text).toBe("What rank are the current members?");
  });

  it("rejects an empty question", () => {
    expect(() => questionTextSchema.parse({ text: "  " })).toThrow();
  });

  it("rejects a question over 300 characters", () => {
    expect(() => questionTextSchema.parse({ text: "a".repeat(301) })).toThrow();
  });
});

describe("replyTextSchema", () => {
  it("accepts a non-empty reply", () => {
    const result = replyTextSchema.parse({ reply: "You'd be a great fit." });
    expect(result.reply).toBe("You'd be a great fit.");
  });

  it("rejects an empty reply", () => {
    expect(() => replyTextSchema.parse({ reply: "" })).toThrow();
  });

  it("rejects a reply over 500 characters", () => {
    expect(() => replyTextSchema.parse({ reply: "a".repeat(501) })).toThrow();
  });
});
