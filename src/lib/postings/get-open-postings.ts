import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { getAutoHideCondition } from "@/lib/moderation/auto-hide";

export type OpenPosting = {
  id: string;
  hostId: string;
  hostHandle: string;
  hostAvatarColor: string | null;
  game: string;
  title: string;
  blurb: string;
  vibe: string;
  region: string;
  seatsTotal: number;
  seatsOpen: number;
  createdAt: Date;
};

// FR-004: only ever reads status = 'open' -- a full or closed posting
// never appears on Home. Joins users for the host's real handle/avatar
// (FR-005) -- the host's display name is never shown to other users
// (ADR 0006); only the handle is. Excludes a deactivated host's
// postings (Profile + Account settings 007's FR-013/SC-005) and a
// moderator-removed posting (Admin Users 016's FR-009).
export async function getOpenPostings(): Promise<OpenPosting[]> {
  const conditions = [eq(postings.status, "open"), isNull(users.deactivatedAt), isNull(postings.removedAt)];
  const autoHideCondition = await getAutoHideCondition("posting", postings.id);
  if (autoHideCondition) conditions.push(autoHideCondition);

  const rows = await db
    .select({
      id: postings.id,
      hostId: postings.hostId,
      hostHandle: users.handle,
      hostAvatarColor: users.avatarColor,
      game: postings.game,
      title: postings.title,
      blurb: postings.blurb,
      vibe: postings.vibe,
      region: postings.region,
      seatsTotal: postings.seatsTotal,
      seatsOpen: postings.seatsOpen,
      createdAt: postings.createdAt,
    })
    .from(postings)
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(and(...conditions))
    .orderBy(desc(postings.createdAt));

  return rows.map((row) => ({ ...row, hostHandle: row.hostHandle ?? "player" }));
}
