import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { follows, userGames, users } from "@/db/schema";

export type MutualFollow = { id: string; handle: string; avatarColor: string | null; avatarImage: string | null; image: string | null };

export type InCommon = {
  mutualFollows: MutualFollow[];
  sharedGames: string[];
};

// FR-008/research.md #5: computed at read time, never stored. Mutual
// follows = accounts BOTH the viewer and the profile owner follow
// (intersection of two `follows` queries, joined on `followeeId`).
// Shared games = intersection of both users' `userGames.game` lists
// (the same real, currently-maintained source get-public-profile.ts
// reads, not the stale `users.gamesPlayed` onboarding snapshot). Only
// meaningful for an authenticated viewer who isn't the profile owner
// -- callers are responsible for that check (page.tsx never calls this
// for a logged-out or self view).
export async function getInCommon(viewerId: string, profileOwnerId: string): Promise<InCommon> {
  const [viewerFollows, ownerFollows, viewerGames, ownerGames] = await Promise.all([
    db.select({ followeeId: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId)),
    db.select({ followeeId: follows.followeeId }).from(follows).where(eq(follows.followerId, profileOwnerId)),
    db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, viewerId)),
    db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, profileOwnerId)),
  ]);

  const ownerFolloweeIds = new Set(ownerFollows.map((row) => row.followeeId));
  const mutualIds = viewerFollows.map((row) => row.followeeId).filter((id) => ownerFolloweeIds.has(id));

  const mutualFollows = mutualIds.length
    ? await db.select({ id: users.id, handle: users.handle, avatarColor: users.avatarColor, avatarImage: users.avatarImage, image: users.image }).from(users).where(inArray(users.id, mutualIds))
    : [];

  const ownerGameSet = new Set(ownerGames.map((row) => row.game));
  const sharedGames = [...new Set(viewerGames.map((row) => row.game).filter((game) => ownerGameSet.has(game)))];

  return {
    mutualFollows: mutualFollows.map((row) => ({ ...row, handle: row.handle ?? "player" })),
    sharedGames,
  };
}
