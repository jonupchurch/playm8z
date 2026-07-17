import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/admin/log-audit-entry", () => ({ logAuditEntry: vi.fn() }));

const { put, del } = await import("@vercel/blob");
const { auth } = await import("@/auth");
const { requireRole } = await import("@/lib/auth/require-role");
const mockedPut = put as unknown as ReturnType<typeof vi.fn>;
const mockedDel = del as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>;

const { db } = await import("@/db");
const { games, users } = await import("@/db/schema");
const {
  createGame,
  renameGame,
  disableGame,
  addGameAlias,
  uploadGameImage,
  removeGameImage,
} = await import("./manage-game");

const runId = crypto.randomUUID().slice(0, 8);
const modEmail = `mgame-mod-${runId}@example.com`;
const tag = `MGAME ${runId}`; // prefix for this run's game names, for cleanup
let modId: string;

function fakeImageFile(bytes: number, type = "image/jpeg", name = "g.jpg"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}
function form(file: unknown): FormData {
  const fd = new FormData();
  if (file !== undefined) fd.set("file", file as File);
  return fd;
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockedRequireRole.mockResolvedValue(undefined);
  mockedPut.mockResolvedValue({ url: "https://blob.example/game-images/new.jpg" });
  mockedDel.mockResolvedValue(undefined);
  const [u] = await db
    .insert(users)
    .values({ email: modEmail, handle: `mgamemod${runId}` })
    .onConflictDoUpdate({ target: users.email, set: { handle: `mgamemod${runId}` } })
    .returning({ id: users.id });
  modId = u.id;
  mockedAuth.mockResolvedValue({ user: { email: modEmail }, expires: new Date(Date.now() + 60_000).toISOString() });
});

afterEach(async () => {
  await db.delete(games).where(like(games.name, `${tag}%`));
  await db.delete(users).where(eq(users.id, modId));
});

describe("createGame", () => {
  it("creates a game and returns its id", async () => {
    const r = await createGame(`${tag} Valorant`);
    expect(r.success).toBe(true);
  });

  it("rejects a blank name", async () => {
    const r = await createGame("   ");
    expect(r.success).toBe(false);
  });

  it("rejects a duplicate normalised name (FR-012)", async () => {
    await createGame(`${tag} Valorant`);
    const dup = await createGame(`  ${tag.toLowerCase()} valorant `);
    expect(dup.success).toBe(false);
  });
});

describe("FR-015 cross-table uniqueness", () => {
  it("refuses an alias that equals an existing game's name", async () => {
    const a = await createGame(`${tag} D&D 5e`);
    const b = await createGame(`${tag} Pathfinder`);
    expect(a.success && b.success).toBe(true);
    if (!a.success || !b.success) return;

    // Try to alias "D&D 5e" (a game name) onto Pathfinder -> refused.
    const r = await addGameAlias(b.data.id, `${tag} D&D 5e`);
    expect(r.success).toBe(false);
  });

  it("refuses a game name that equals an existing alias", async () => {
    const a = await createGame(`${tag} Helldivers 2`);
    if (!a.success) return;
    const alias = await addGameAlias(a.data.id, `${tag} HD2`);
    expect(alias.success).toBe(true);

    // Now try to create a new game literally named "HD2" -> refused.
    const r = await createGame(`${tag} HD2`);
    expect(r.success).toBe(false);
  });

  it("refuses the same alias mapped to two games", async () => {
    const a = await createGame(`${tag} Souls A`);
    const b = await createGame(`${tag} Souls B`);
    if (!a.success || !b.success) return;
    const first = await addGameAlias(a.data.id, `${tag} Souls`);
    expect(first.success).toBe(true);
    const second = await addGameAlias(b.data.id, `${tag} Souls`);
    expect(second.success).toBe(false);
  });

  it("allows renaming a game to its own current name (excludes self)", async () => {
    const a = await createGame(`${tag} CS`);
    if (!a.success) return;
    const r = await renameGame(a.data.id, `${tag} CS`);
    expect(r.success).toBe(true);
  });
});

describe("image lifecycle", () => {
  it("rejects a non-image and an oversize file", async () => {
    const a = await createGame(`${tag} Img`);
    if (!a.success) return;
    expect((await uploadGameImage(a.data.id, form(new File(["x"], "x.exe", { type: "application/x-msdownload" })))).success).toBe(false);
    expect((await uploadGameImage(a.data.id, form(fakeImageFile(6 * 1024 * 1024)))).success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("stores the image and deletes the prior blob on replace", async () => {
    const a = await createGame(`${tag} Img2`);
    if (!a.success) return;
    await uploadGameImage(a.data.id, form(fakeImageFile(1024)));
    const [g1] = await db.select({ imageUrl: games.imageUrl }).from(games).where(eq(games.id, a.data.id));
    expect(g1.imageUrl).toBe("https://blob.example/game-images/new.jpg");

    mockedPut.mockResolvedValue({ url: "https://blob.example/game-images/newer.jpg" });
    await uploadGameImage(a.data.id, form(fakeImageFile(1024)));
    expect(mockedDel).toHaveBeenCalledWith("https://blob.example/game-images/new.jpg");
  });

  it("removeGameImage nulls the column and deletes the blob", async () => {
    const a = await createGame(`${tag} Img3`);
    if (!a.success) return;
    await uploadGameImage(a.data.id, form(fakeImageFile(1024)));
    await removeGameImage(a.data.id);
    const [g] = await db.select({ imageUrl: games.imageUrl }).from(games).where(eq(games.id, a.data.id));
    expect(g.imageUrl).toBeNull();
    expect(mockedDel).toHaveBeenCalled();
  });
});

describe("disable (soft-delete, ADR 0005)", () => {
  it("sets disabledAt rather than deleting the row", async () => {
    const a = await createGame(`${tag} Dis`);
    if (!a.success) return;
    await disableGame(a.data.id);
    const [g] = await db.select({ disabledAt: games.disabledAt }).from(games).where(eq(games.id, a.data.id));
    expect(g.disabledAt).not.toBeNull(); // still exists, just dated
  });
});

describe("gating", () => {
  it("requires moderator", async () => {
    mockedRequireRole.mockRejectedValue(new Error("Forbidden"));
    await expect(createGame(`${tag} Nope`)).rejects.toThrow();
  });
});
