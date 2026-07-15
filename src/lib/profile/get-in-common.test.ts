import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { follows, userGames, users } from "@/db/schema";
import { getInCommon } from "./get-in-common";

describe("getInCommon (integration)", () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const followIds: string[] = [];
  const userGameIds: string[] = [];

  afterAll(async () => {
    for (const id of followIds) await db.delete(follows).where(eq(follows.id, id));
    for (const id of userGameIds) await db.delete(userGames).where(eq(userGames.id, id));
    for (const id of userIds) await db.delete(users).where(eq(users.id, id));
  });

  it("computes the intersection of mutual follows and shared games", async () => {
    const [viewer] = await db
      .insert(users)
      .values({ email: `gic-viewer-${runId}@example.com`, handle: `gicviewer${runId}` })
      .returning({ id: users.id });
    const [owner] = await db
      .insert(users)
      .values({ email: `gic-owner-${runId}@example.com`, handle: `gicowner${runId}` })
      .returning({ id: users.id });
    const [mutual] = await db
      .insert(users)
      .values({ email: `gic-mutual-${runId}@example.com`, handle: `gicmutual${runId}` })
      .returning({ id: users.id });
    const [viewerOnly] = await db
      .insert(users)
      .values({ email: `gic-vieweronly-${runId}@example.com`, handle: `gicvieweronly${runId}` })
      .returning({ id: users.id });
    userIds.push(viewer.id, owner.id, mutual.id, viewerOnly.id);

    const [f1] = await db.insert(follows).values({ followerId: viewer.id, followeeId: mutual.id }).returning({ id: follows.id });
    const [f2] = await db.insert(follows).values({ followerId: owner.id, followeeId: mutual.id }).returning({ id: follows.id });
    const [f3] = await db.insert(follows).values({ followerId: viewer.id, followeeId: viewerOnly.id }).returning({ id: follows.id });
    followIds.push(f1.id, f2.id, f3.id);

    const [g1] = await db.insert(userGames).values({ userId: viewer.id, game: "Valorant" }).returning({ id: userGames.id });
    const [g2] = await db.insert(userGames).values({ userId: owner.id, game: "Valorant" }).returning({ id: userGames.id });
    const [g3] = await db.insert(userGames).values({ userId: viewer.id, game: "Only Viewer Plays This" }).returning({ id: userGames.id });
    userGameIds.push(g1.id, g2.id, g3.id);

    const result = await getInCommon(viewer.id, owner.id);
    expect(result.mutualFollows.map((f) => f.id)).toEqual([mutual.id]);
    expect(result.sharedGames).toEqual(["Valorant"]);
    expect(result.sharedGames).not.toContain("Only Viewer Plays This");
  });

  it("returns empty arrays when there's no overlap", async () => {
    const [a] = await db
      .insert(users)
      .values({ email: `gic-a-${runId}@example.com`, handle: `gica${runId}` })
      .returning({ id: users.id });
    const [b] = await db
      .insert(users)
      .values({ email: `gic-b-${runId}@example.com`, handle: `gicb${runId}` })
      .returning({ id: users.id });
    userIds.push(a.id, b.id);

    const result = await getInCommon(a.id, b.id);
    expect(result.mutualFollows).toEqual([]);
    expect(result.sharedGames).toEqual([]);
  });
});
