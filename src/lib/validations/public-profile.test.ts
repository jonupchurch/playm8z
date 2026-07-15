import { describe, expect, it } from "vitest";
import { inviteToPartySchema, toggleFollowSchema } from "./public-profile";

describe("toggleFollowSchema", () => {
  it("requires a valid uuid followeeId", () => {
    expect(toggleFollowSchema.safeParse({ followeeId: "not-a-uuid" }).success).toBe(false);
    expect(toggleFollowSchema.safeParse({ followeeId: crypto.randomUUID() }).success).toBe(true);
  });
});

describe("inviteToPartySchema", () => {
  it("requires valid uuid postingId and invitedUserId", () => {
    expect(inviteToPartySchema.safeParse({ postingId: "x", invitedUserId: crypto.randomUUID() }).success).toBe(false);
    expect(inviteToPartySchema.safeParse({ postingId: crypto.randomUUID(), invitedUserId: "x" }).success).toBe(false);
    expect(
      inviteToPartySchema.safeParse({ postingId: crypto.randomUUID(), invitedUserId: crypto.randomUUID() }).success,
    ).toBe(true);
  });
});
