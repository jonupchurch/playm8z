"use server";

import { and, eq, ilike, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { contactSearchSchema } from "@/lib/validations/inbox";

export type ContactCandidate = {
  id: string;
  handle: string;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
};

const CONTACT_LIMIT = 20;

// FR-006: excludes the searching user themselves and anyone with an
// active block relationship in EITHER direction -- unlike Blocked
// Users' (008) own candidate search (which only excludes people the
// searching user has blocked, since that's all its own "pick someone
// to block" flow needs), messaging must also exclude someone who has
// blocked the searching user. Queries `blocks` directly rather than
// reusing that feature's search-users.ts, per plan.md's Structure
// Decision -- no change to Blocked Users' own files.
export async function searchContacts(query: string): Promise<ContactCandidate[]> {
  const user = await requireAuth();
  const parsed = contactSearchSchema.safeParse({ q: query });
  const q = parsed.success ? parsed.data.q : "";

  const activeBlocks = await db
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(
      and(
        or(eq(blocks.blockerId, user.id), eq(blocks.blockedId, user.id)),
        isNull(blocks.unblockedAt),
      ),
    );

  const excludedIds = new Set<string>([user.id]);
  activeBlocks.forEach((block) => {
    excludedIds.add(block.blockerId === user.id ? block.blockedId : block.blockerId);
  });

  const conditions = [notInArray(users.id, [...excludedIds]), isNotNull(users.handle)];

  const trimmed = q.trim();
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    const match = or(ilike(users.handle, pattern), ilike(users.name, pattern));
    if (match) conditions.push(match);
  }

  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
    })
    .from(users)
    .where(and(...conditions))
    .limit(CONTACT_LIMIT);

  return rows.map((row) => ({ ...row, handle: row.handle ?? "player" }));
}

// Server-side re-check for start-conversation.ts (edge case in
// spec.md): the compose search's exclusion is a UX nicety, not the
// real guard -- a direct attempt to message a blocked/blocking user
// must be rejected even if the UI filter is bypassed.
export async function hasActiveBlockBetween(userIdA: string, userIdB: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(
        or(
          and(eq(blocks.blockerId, userIdA), eq(blocks.blockedId, userIdB)),
          and(eq(blocks.blockerId, userIdB), eq(blocks.blockedId, userIdA)),
        ),
        isNull(blocks.unblockedAt),
      ),
    );
  return !!existing;
}
