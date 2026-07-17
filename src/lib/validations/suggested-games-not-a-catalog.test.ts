import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { gamesPlayedSchema } from "@/lib/validations/onboarding";
import { getSettings, invalidateSettingsCache } from "@/lib/settings/get-settings";

// 031 FR-006/FR-007, and the reason this feature is small.
//
// The suggested-games list is a SUGGESTION, never a catalog. A player's
// games are free text (ADR 0001: no curated Game catalog), and they have
// never been validated against this list. That is what makes removing a
// game harmless -- there is no coupling to break.
//
// The way to ruin this feature is to "improve" the validation by
// checking gamesPlayed against the list. It would look like a
// correctness fix and would in fact build the catalog ADR 0001 rejects,
// silently invalidating every player who plays something unfashionable.
// These tests exist to make that regression loud.
const runId = crypto.randomUUID().slice(0, 8);
const playerEmail = `not-a-catalog-${runId}@example.com`;
const OBSCURE = `Some Obscure Indie Game ${runId}`;
let playerId: string;
let originalGames: string[];

beforeAll(async () => {
  const [player] = await db
    .insert(users)
    .values({ email: playerEmail, handle: `notcatalog${runId}`, gamesPlayed: ["CS2", OBSCURE] })
    .returning({ id: users.id });
  playerId = player.id;
  originalGames = (await getSettings()).suggestedGames;
});

afterAll(async () => {
  await db.update(settings).set({ suggestedGames: originalGames });
  invalidateSettingsCache();
  await db.delete(users).where(eq(users.id, playerId));
});

describe("a player's games are free text, not the suggestion list", () => {
  it("accepts a game that is not, and never was, a suggestion", () => {
    expect(gamesPlayedSchema.parse([OBSCURE])).toEqual([OBSCURE]);
  });

  it("still rejects a blank game -- free text is not no text", () => {
    expect(() => gamesPlayedSchema.parse([""])).toThrow();
    expect(() => gamesPlayedSchema.parse(["   "])).toThrow();
  });

  // FR-006: the central safety property. An admin edit must never reach
  // into anybody's profile.
  it("leaves a player's games untouched when a game is removed from the suggestions", async () => {
    // Retire CS2 from the suggestions entirely.
    await db.update(settings).set({ suggestedGames: originalGames.filter((game) => game !== "CS2") });
    invalidateSettingsCache();

    const [player] = await db.select({ gamesPlayed: users.gamesPlayed }).from(users).where(eq(users.id, playerId));
    expect(player.gamesPlayed).toEqual(["CS2", OBSCURE]);

    // And it's still a perfectly valid value to submit.
    expect(gamesPlayedSchema.parse(["CS2"])).toEqual(["CS2"]);
  });

  it("never reads the suggestion list to decide what a player may have", async () => {
    const { suggestedGames } = await getSettings();
    expect(suggestedGames).not.toContain(OBSCURE);
    // Parses fine regardless -- the list simply isn't consulted.
    expect(gamesPlayedSchema.parse([OBSCURE, "CS2"])).toEqual([OBSCURE, "CS2"]);
  });
});
