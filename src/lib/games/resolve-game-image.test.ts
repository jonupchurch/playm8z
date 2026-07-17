import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameAliases, games } from "@/db/schema";
import { resolveGameImage, resolveGameImages } from "./resolve-game-image";
import { normalizeGame } from "./normalize-game";

const runId = crypto.randomUUID().slice(0, 8);
const gameName = `E2ERes DnD ${runId}`;
const noImageName = `E2ERes NoImg ${runId}`;
const disabledName = `E2ERes Disabled ${runId}`;
const aliasVariant = `e2eres dnd variant ${runId}`;

let gameId: string;
let noImageId: string;
let disabledId: string;

beforeAll(async () => {
  const [g] = await db
    .insert(games)
    .values({ name: gameName, normalizedName: normalizeGame(gameName), imageUrl: "https://blob.example/dnd.jpg" })
    .returning({ id: games.id });
  gameId = g.id;
  await db.insert(gameAliases).values({ gameId, normalizedAlias: normalizeGame(aliasVariant) });

  const [n] = await db
    .insert(games)
    .values({ name: noImageName, normalizedName: normalizeGame(noImageName), imageUrl: null })
    .returning({ id: games.id });
  noImageId = n.id;

  const [d] = await db
    .insert(games)
    .values({
      name: disabledName,
      normalizedName: normalizeGame(disabledName),
      imageUrl: "https://blob.example/disabled.jpg",
      disabledAt: new Date(),
    })
    .returning({ id: games.id });
  disabledId = d.id;
});

afterAll(async () => {
  for (const id of [gameId, noImageId, disabledId]) {
    await db.delete(games).where(eq(games.id, id)); // aliases cascade
  }
});

describe("resolveGameImage", () => {
  it("returns the admin image when the name matches an enabled game (FR-001)", async () => {
    await expect(resolveGameImage(gameName)).resolves.toEqual({
      kind: "admin",
      url: "https://blob.example/dnd.jpg",
    });
  });

  it("matches case/whitespace-insensitively", async () => {
    await expect(resolveGameImage(`  ${gameName.toUpperCase()} `)).resolves.toMatchObject({
      kind: "admin",
    });
  });

  it("returns the admin image via an alias (FR-016)", async () => {
    await expect(resolveGameImage(aliasVariant)).resolves.toEqual({
      kind: "admin",
      url: "https://blob.example/dnd.jpg",
    });
  });

  it("returns a generated visual for a game that has a row but no image", async () => {
    const r = await resolveGameImage(noImageName);
    expect(r.kind).toBe("generated");
  });

  it("returns a generated visual for a DISABLED game (FR-013), never its old image", async () => {
    const r = await resolveGameImage(disabledName);
    expect(r.kind).toBe("generated");
    if (r.kind === "generated") expect(JSON.stringify(r)).not.toContain("disabled.jpg");
  });

  it("returns a generated visual for a name that matches nothing", async () => {
    const r = await resolveGameImage(`totally unknown ${runId}`);
    expect(r.kind).toBe("generated");
  });

  it("returns a generated visual for an empty name rather than throwing", async () => {
    await expect(resolveGameImage("")).resolves.toMatchObject({ kind: "generated" });
  });
});

describe("resolveGameImages (batched)", () => {
  it("resolves many names in ONE round trip, not N (the N+1 guard)", async () => {
    const spy = vi.spyOn(db, "select");
    await resolveGameImages([gameName, noImageName, disabledName, `unknown ${runId}`, aliasVariant]);
    // Two selects total (name-match + alias-match), regardless of how many
    // names were passed -- not one per name.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    spy.mockRestore();
  });

  it("returns an entry for EVERY requested name, keyed by normalised name", async () => {
    const names = [gameName, `unknown ${runId}`];
    const map = await resolveGameImages(names);
    expect(map.get(normalizeGame(gameName))?.kind).toBe("admin");
    expect(map.get(normalizeGame(`unknown ${runId}`))?.kind).toBe("generated");
  });

  it("handles an empty list and blank names without querying uselessly", async () => {
    await expect(resolveGameImages([])).resolves.toBeInstanceOf(Map);
    const map = await resolveGameImages(["   "]);
    expect(map.size).toBe(0); // blank normalises away
  });
});
