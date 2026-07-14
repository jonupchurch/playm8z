import { describe, expect, it } from "vitest";
import {
  contactSearchSchema,
  requestActionSchema,
  sendMessageSchema,
  startConversationSchema,
} from "./inbox";

const conversationId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const applicationId = "4fa85f64-5717-4562-b3fc-2c963f66afa6";
const recipientId = "5fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("sendMessageSchema", () => {
  it("accepts a valid message", () => {
    const result = sendMessageSchema.parse({ conversationId, body: "Hey there" });
    expect(result.body).toBe("Hey there");
  });

  it("rejects an empty body", () => {
    expect(() => sendMessageSchema.parse({ conversationId, body: "" })).toThrow();
  });

  it("rejects a body over 2000 characters", () => {
    expect(() => sendMessageSchema.parse({ conversationId, body: "a".repeat(2001) })).toThrow();
  });

  it("rejects a non-uuid conversationId", () => {
    expect(() => sendMessageSchema.parse({ conversationId: "not-a-uuid", body: "hi" })).toThrow();
  });
});

describe("startConversationSchema", () => {
  it("accepts a single recipient (direct)", () => {
    const result = startConversationSchema.parse({ recipientIds: [recipientId] });
    expect(result.recipientIds).toHaveLength(1);
  });

  it("accepts multiple recipients with an optional group name", () => {
    const result = startConversationSchema.parse({
      recipientIds: [recipientId, conversationId],
      groupName: "Party",
    });
    expect(result.groupName).toBe("Party");
  });

  it("rejects an empty recipient list", () => {
    expect(() => startConversationSchema.parse({ recipientIds: [] })).toThrow();
  });

  it("rejects more than 20 recipients", () => {
    const many = Array.from({ length: 21 }, () => recipientId);
    expect(() => startConversationSchema.parse({ recipientIds: many })).toThrow();
  });

  it("rejects a group name over 60 characters", () => {
    expect(() =>
      startConversationSchema.parse({ recipientIds: [recipientId], groupName: "a".repeat(61) }),
    ).toThrow();
  });
});

describe("requestActionSchema", () => {
  it("accepts a valid applicationId", () => {
    const result = requestActionSchema.parse({ applicationId });
    expect(result.applicationId).toBe(applicationId);
  });

  it("rejects a non-uuid applicationId", () => {
    expect(() => requestActionSchema.parse({ applicationId: "not-a-uuid" })).toThrow();
  });
});

describe("contactSearchSchema", () => {
  it("defaults q to an empty string", () => {
    expect(contactSearchSchema.parse({}).q).toBe("");
  });

  it("trims whitespace", () => {
    expect(contactSearchSchema.parse({ q: "  mara  " }).q).toBe("mara");
  });
});
