import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

const { db } = await import("@/db");
const { getSettings, invalidateSettingsCache } = await import("./get-settings");

const mockedSelect = db.select as unknown as ReturnType<typeof vi.fn>;

const FULL_ROW = {
  maintenanceMode: true,
  maintenanceMessage: "Back by 3am UTC",
  siteName: "playm8z",
  tagline: "Assemble your party",
  supportEmail: "support@playm8z.com",
  defaultTheme: "dark" as const,
  phraseFilterEnabled: true,
  linkFilterEnabled: true,
  boostFilterEnabled: true,
  newAccountReviewEnabled: true,
  bannedPhrases: ["free nitro"],
  autoHideEnabled: false,
  autoHideThreshold: 3,
  autoEscalateSeverity: "high" as const,
  discordFlag: false,
  groupsFlag: false,
  ratingsFlag: false,
  forumFlag: true,
  tabletopFlag: true,
  openSignups: true,
  discoverableByDefault: true,
  genres: ["FPS", "RPG"],
  suggestedGames: ["Valorant", "Catan"],
};

const DEFAULTS = {
  maintenanceMode: false,
  maintenanceMessage: null,
  siteName: "playm8z",
  tagline: null,
  supportEmail: null,
  defaultTheme: "dark" as const,
  phraseFilterEnabled: true,
  linkFilterEnabled: true,
  boostFilterEnabled: true,
  newAccountReviewEnabled: true,
  bannedPhrases: ["free nitro", "cheap boosting", "click here", "dm for rates", "gift-nitro"],
  autoHideEnabled: false,
  autoHideThreshold: 3,
  autoEscalateSeverity: "high" as const,
  discordFlag: false,
  groupsFlag: false,
  ratingsFlag: false,
  forumFlag: true,
  tabletopFlag: true,
  openSignups: true,
  discoverableByDefault: true,
  genres: ["FPS", "RPG", "Co-op PvE", "Party", "MOBA", "Sandbox", "TTRPG", "Tabletop"],
  suggestedGames: [
    "Valorant",
    "Helldivers 2",
    "Baldur's Gate 3",
    "CS2",
    "Deep Rock Galactic",
    "Lethal Company",
    "Sea of Thieves",
    "League of Legends",
    "Overwatch 2",
    "Minecraft",
    "Elden Ring",
    "D&D 5e",
    "Catan",
    "Magic: The Gathering",
  ],
};

function mockRow(row: unknown) {
  mockedSelect.mockReturnValue({
    from: () => ({
      limit: () => Promise.resolve(row === undefined ? [] : [row]),
    }),
  });
}

describe("getSettings", () => {
  beforeEach(() => {
    invalidateSettingsCache();
    mockedSelect.mockReset();
  });

  it("returns a valid row's values as-is", async () => {
    mockRow(FULL_ROW);
    const result = await getSettings();
    expect(result).toEqual(FULL_ROW);
  });

  it("treats a null message as the generic-fallback case", async () => {
    mockRow({ ...FULL_ROW, maintenanceMode: false, maintenanceMessage: null });
    const result = await getSettings();
    expect(result.maintenanceMessage).toBeNull();
  });

  it("falls back to safe defaults when the row fails Zod validation", async () => {
    mockRow({ ...FULL_ROW, maintenanceMode: "not-a-boolean" });
    const result = await getSettings();
    expect(result).toEqual(DEFAULTS);
  });

  it("falls back to safe defaults when no row exists at all", async () => {
    mockRow(undefined);
    const result = await getSettings();
    expect(result).toEqual(DEFAULTS);
  });

  // 030: a stored empty genre list would leave Post a Game with nothing
  // to offer, so the schema's .min(1) rejects it and the whole read
  // degrades to DEFAULTS -- i.e. the list that used to be hardcoded --
  // rather than to no genres at all.
  it("falls back to the default genres rather than serving an empty list", async () => {
    mockRow({ ...FULL_ROW, genres: [] });
    const result = await getSettings();
    expect(result.genres).toEqual(DEFAULTS.genres);
  });

  it("caches the result -- a second call within the TTL doesn't hit the database again", async () => {
    mockRow(FULL_ROW);
    await getSettings();
    await getSettings();
    expect(mockedSelect).toHaveBeenCalledOnce();
  });
});
