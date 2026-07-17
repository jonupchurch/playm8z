import { describe, expect, it } from "vitest";
import { postingSchema } from "./posting";

const validPayload = {
  game: "Valorant",
  genre: "FPS",
  title: "Ranked grind",
  blurb: "Need 2 for a serious climb.",
  tags: "chill, no-toxicity",
  vibe: "serious" as const,
  platform: "pc" as const,
  region: "eu-west" as const,
  ageGroup: "30-49" as const,
  timeSlots: ["evening" as const],
  scheduledDate: "",
  recurring: false,
  seatsTotal: 5,
  seatsOpen: 3,
  micRequired: true,
  voiceLink: "",
};

describe("postingSchema", () => {
  it("accepts a fully-filled valid payload", () => {
    const result = postingSchema.parse(validPayload);
    expect(result.game).toBe("Valorant");
    expect(result.tags).toEqual(["chill", "no-toxicity"]);
    expect(result.scheduledDate).toBeUndefined();
    expect(result.voiceLink).toBeUndefined();
  });

  it("accepts the minimal required fields (game, title, platform, region) with defaults for the rest", () => {
    const result = postingSchema.parse({
      game: "Catan",
      title: "Board game night",
      platform: "table",
      region: "na-east",
      seatsTotal: 4,
      seatsOpen: 3,
    });
    expect(result.vibe).toBe("fun");
    // ADR 0009: the default is "any" -- a host who never touches the
    // field claims nothing about who their party is for.
    expect(result.ageGroup).toBe("any");
    expect(result.genre).toBeUndefined();
    expect(result.tags).toEqual([]);
    expect(result.timeSlots).toEqual([]);
    expect(result.recurring).toBe(false);
    expect(result.micRequired).toBe(false);
  });

  it("rejects an empty game", () => {
    expect(() => postingSchema.parse({ ...validPayload, game: "  " })).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() => postingSchema.parse({ ...validPayload, title: "" })).toThrow();
  });

  it("rejects a title over 60 characters", () => {
    expect(() => postingSchema.parse({ ...validPayload, title: "a".repeat(61) })).toThrow();
  });

  it("rejects a description over 240 characters", () => {
    expect(() => postingSchema.parse({ ...validPayload, blurb: "a".repeat(241) })).toThrow();
  });

  it("comma-splits and caps tags at 6", () => {
    const result = postingSchema.parse({
      ...validPayload,
      tags: "a, b, c, d, e, f, g, h",
    });
    expect(result.tags).toEqual(["a", "b", "c", "d", "e", "f", "g"].slice(0, 6));
  });

  // Still true, and still worth keeping -- but now for a second reason
  // too: under ADR 0009 the vocabulary is a demographic range, and 13
  // isn't one of them either. ADR 0002's 18+ platform minimum stands.
  it("rejects an ageGroup of 13 (ADR 0002 -- no 13+ tier)", () => {
    expect(() => postingSchema.parse({ ...validPayload, ageGroup: "13" })).toThrow();
  });

  // ADR 0009 retired these. They can never be created anew -- only
  // manage-posting.ts tolerates one, and only for a row that already
  // holds it (see age-group-legacy.test.ts).
  it("rejects the retired 18 and 21 (ADR 0009)", () => {
    expect(() => postingSchema.parse({ ...validPayload, ageGroup: "18" })).toThrow();
    expect(() => postingSchema.parse({ ...validPayload, ageGroup: "21" })).toThrow();
  });

  it("accepts each of ADR 0009's four values", () => {
    for (const ageGroup of ["any", "18-29", "30-49", "50plus"]) {
      expect(postingSchema.parse({ ...validPayload, ageGroup }).ageGroup).toBe(ageGroup);
    }
  });

  it("rejects seatsOpen equal to seatsTotal (must leave at least the host's own seat)", () => {
    expect(() =>
      postingSchema.parse({ ...validPayload, seatsTotal: 4, seatsOpen: 4 }),
    ).toThrow();
  });

  it("accepts seatsOpen at exactly seatsTotal - 1", () => {
    const result = postingSchema.parse({ ...validPayload, seatsTotal: 4, seatsOpen: 3 });
    expect(result.seatsOpen).toBe(3);
  });

  it("rejects a direct request bypassing the UI's stepper clamping", () => {
    expect(() =>
      postingSchema.parse({ ...validPayload, seatsTotal: 2, seatsOpen: 5 }),
    ).toThrow();
  });

  it("rejects a seatsTotal outside 2-8", () => {
    expect(() => postingSchema.parse({ ...validPayload, seatsTotal: 1, seatsOpen: 1 })).toThrow();
    expect(() =>
      postingSchema.parse({ ...validPayload, seatsTotal: 9, seatsOpen: 8 }),
    ).toThrow();
  });

  it("rejects an invalid platform", () => {
    expect(() => postingSchema.parse({ ...validPayload, platform: "mobile" })).toThrow();
  });

  // 030: genre membership is deliberately NOT checked here any more.
  // The list is admin-editable, so it can't be a z.enum() (which needs
  // its values at module-evaluation time) -- the schema checks shape and
  // the actions check membership: create-posting.ts strictly, and
  // manage-posting.ts tolerantly so a host whose genre got retired can
  // still edit their own posting. See those two files' own tests.
  it("accepts any well-shaped genre string -- membership is the actions' job now", () => {
    expect(postingSchema.parse({ ...validPayload, genre: "Racing" }).genre).toBe("Racing");
  });

  it("still rejects a genre that's the wrong shape", () => {
    expect(() => postingSchema.parse({ ...validPayload, genre: "x".repeat(51) })).toThrow();
  });

  it("treats an empty genre as absent rather than invalid", () => {
    const result = postingSchema.parse({ ...validPayload, genre: "" });
    expect(result.genre).toBeUndefined();
  });
});
