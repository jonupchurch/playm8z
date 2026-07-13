import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";

export type OpenPosting = {
  id: string;
  hostId: string;
  hostName: string;
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
// never appears on Home. Joins users for the host's real name/avatar
// (FR-005) rather than inventing per-listing display data.
export async function getOpenPostings(): Promise<OpenPosting[]> {
  const rows = await db
    .select({
      id: postings.id,
      hostId: postings.hostId,
      hostName: users.name,
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
    .where(eq(postings.status, "open"))
    .orderBy(desc(postings.createdAt));

  return rows.map((row) => ({ ...row, hostName: row.hostName ?? "Player" }));
}
