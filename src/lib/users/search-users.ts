import { and, eq, ilike, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, users } from "@/db/schema";

export type UserCandidate = {
  id: string;
  handle: string;
  avatarColor: string | null;
  // Optional: the candidate-search query always supplies these, but a
  // hand-built preSelected literal (e.g. profile-header.tsx blocking a
  // user directly) may omit them until that caller is widened -- the
  // Avatar falls back to the gradient in that case.
  avatarImage?: string | null;
  image?: string | null;
};

const CANDIDATE_LIMIT = 20;

// FR-005: candidates for the Block modal's pick step, excluding the
// searching user themselves and anyone they've already actively
// blocked. A user with no handle yet (mid-onboarding) is excluded too
// -- ADR 0006 means there's nothing to display or block them by.
export async function searchCandidateUsers(query: string, excludeUserId: string): Promise<UserCandidate[]> {
  const activeBlocks = await db
    .select({ blockedId: blocks.blockedId })
    .from(blocks)
    .where(and(eq(blocks.blockerId, excludeUserId), isNull(blocks.unblockedAt)));

  const excludedIds = [excludeUserId, ...activeBlocks.map((row) => row.blockedId)];

  const conditions = [notInArray(users.id, excludedIds), isNotNull(users.handle)];

  const trimmed = query.trim();
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    const match = or(ilike(users.handle, pattern), ilike(users.name, pattern));
    if (match) conditions.push(match);
  }

  return db
    .select({
      id: users.id,
      handle: users.handle,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
    })
    .from(users)
    .where(and(...conditions))
    .limit(CANDIDATE_LIMIT)
    .then((rows) => rows.map((row) => ({ ...row, handle: row.handle ?? "player" })));
}
