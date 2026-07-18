import { describe, expect, it } from "vitest";
import { extractMentionHandles } from "./parse-mentions";

describe("extractMentionHandles", () => {
  it("extracts a simple mention, lowercased", () => {
    expect(extractMentionHandles("hey @Carol")).toEqual(["carol"]);
  });

  it("dedupes repeated mentions case-insensitively, first-seen order", () => {
    expect(extractMentionHandles("@carol and @Bob then @CAROL")).toEqual(["carol", "bob"]);
  });

  it("does not match inside an email address", () => {
    expect(extractMentionHandles("mail carol@example.com please")).toEqual([]);
  });

  it("stops at a trailing non-handle character", () => {
    expect(extractMentionHandles("thanks @carol.")).toEqual(["carol"]);
    expect(extractMentionHandles("(@carol)")).toEqual(["carol"]);
  });

  it("does not treat underscore as part of a handle (handles are alnum only)", () => {
    expect(extractMentionHandles("@carol_bar")).toEqual(["carol"]);
  });

  it("ignores tokens that don't start with a letter", () => {
    expect(extractMentionHandles("@1bad and @_x")).toEqual([]);
  });

  it("does not match an @ glued to the end of a word", () => {
    expect(extractMentionHandles("foo@carol")).toEqual([]);
  });

  it("caps a handle at 24 characters", () => {
    const long = "a".repeat(30);
    expect(extractMentionHandles(`@${long}`)).toEqual(["a".repeat(24)]);
  });

  it("returns nothing for empty or mention-free text", () => {
    expect(extractMentionHandles("")).toEqual([]);
    expect(extractMentionHandles("no mentions here")).toEqual([]);
  });
});
