import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("ai", () => ({ generateText: vi.fn(), Output: { object: vi.fn(() => ({})) } }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/admin/log-audit-entry", () => ({ logAuditEntry: vi.fn() }));

const { generateText } = await import("ai");
const { auth } = await import("@/auth");
const { requireRole } = await import("@/lib/auth/require-role");
const mockedGen = generateText as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const { db } = await import("@/db");
const { gameAliasDismissals, gameAliases, games, postings, users } = await import("@/db/schema");
const { suggestGameAliases, acceptAliasSuggestion, dismissAliasSuggestion } = await import("./suggest-game-aliases");

const runId = crypto.randomUUID().slice(0, 8);
const tag = `SUGG ${runId}`;
const modEmail = `sugg-mod-${runId}@example.com`;
let modId: string, gameId: string, hostId: string;

const basePosting = {
  blurb: "b", vibe: "fun" as const, region: "na-east" as const, ageGroup: "any",
  timeSlots: ["evening"], platform: "pc" as const, micRequired: false,
  seatsTotal: 4, seatsOpen: 2, status: "open" as const,
};

beforeEach(async () => {
  vi.clearAllMocks();
  mockedRole.mockResolvedValue(undefined);
  mockedAuth.mockResolvedValue({ user: { email: modEmail }, expires: new Date(Date.now() + 60_000).toISOString() });

  const [u] = await db.insert(users).values({ email: modEmail, handle: `suggmod${runId}` })
    .onConflictDoUpdate({ target: users.email, set: { handle: `suggmod${runId}` } }).returning({ id: users.id });
  modId = u.id;
  hostId = modId;

  const [g] = await db.insert(games).values({ name: `${tag} D&D 5e`, normalizedName: `${tag.toLowerCase()} d&d 5e` }).returning({ id: games.id });
  gameId = g.id;

  // An open posting whose game is an unmatched variant of the curated game.
  await db.insert(postings).values({ ...basePosting, hostId, game: `${tag} DnD 5e`, title: `t ${runId}` });
});

afterEach(async () => {
  await db.delete(postings).where(eq(postings.hostId, hostId));
  await db.delete(gameAliasDismissals).where(like(gameAliasDismissals.normalizedName, `${tag.toLowerCase()}%`));
  await db.delete(games).where(like(games.name, `${tag}%`)); // aliases cascade
  await db.delete(users).where(eq(users.id, modId));
});

describe("suggestGameAliases (FR-017/018)", () => {
  it("proposes a mapping and creates NO alias (SC-007 -- suggests, never applies)", async () => {
    mockedGen.mockResolvedValue({ output: { matches: [{ rawName: `${tag} DnD 5e`, gameId }] } });

    const result = await suggestGameAliases();
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ gameId, rawName: `${tag} DnD 5e` });

    // The critical assertion: nothing was written.
    const aliases = await db.select().from(gameAliases).where(eq(gameAliases.gameId, gameId));
    expect(aliases).toHaveLength(0);
  });

  it("drops hallucinations -- a gameId not in the list, or a rawName never asked about", async () => {
    mockedGen.mockResolvedValue({
      output: { matches: [
        { rawName: `${tag} DnD 5e`, gameId: "00000000-0000-0000-0000-000000000000" }, // bad game
        { rawName: `${tag} never asked`, gameId }, // not an unmatched string we sent
      ] },
    });
    const result = await suggestGameAliases();
    if (!result.available) return;
    expect(result.suggestions).toHaveLength(0);
  });

  it("degrades gracefully when no AI provider is configured (FR-020)", async () => {
    mockedGen.mockRejectedValue(new Error("AI_GATEWAY_API_KEY is not set"));
    const result = await suggestGameAliases();
    expect(result.available).toBe(false);
    // ...and manual management is unaffected: accept still works below.
  });
});

describe("acceptAliasSuggestion (FR-018 -- same FR-015 path)", () => {
  it("creates the alias, after which the variant resolves to the game", async () => {
    const r = await acceptAliasSuggestion(gameId, `${tag} DnD 5e`);
    expect(r.success).toBe(true);
    const aliases = await db.select().from(gameAliases).where(eq(gameAliases.gameId, gameId));
    expect(aliases).toHaveLength(1);
  });

  it("still enforces FR-015 -- refuses an alias equal to an existing game name", async () => {
    const r = await acceptAliasSuggestion(gameId, `${tag} D&D 5e`); // == the game's own name
    expect(r.success).toBe(false);
  });
});

describe("dismissAliasSuggestion (US4-3)", () => {
  it("records a dismissal, and the dismissed string is then excluded from suggestions", async () => {
    await dismissAliasSuggestion(`${tag} DnD 5e`);
    mockedGen.mockResolvedValue({ output: { matches: [{ rawName: `${tag} DnD 5e`, gameId }] } });
    const result = await suggestGameAliases();
    if (!result.available) return;
    // The only unmatched string was dismissed, so nothing is proposed.
    expect(result.suggestions).toHaveLength(0);
  });
});
