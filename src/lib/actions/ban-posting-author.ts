"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { toggleUserBan } from "@/lib/actions/toggle-user-ban";
import { resolvePostingReport } from "@/lib/actions/resolve-posting-report";
import { banPostingAuthorSchema, type BanPostingAuthorInput } from "@/lib/validations/admin-postings";

export type BanPostingAuthorResult = { success: true } | { success: false; error: string };

// FR-010: bans the posting's author (delegates to Admin Users' (016)
// existing toggle-user-ban.ts -- no second ban implementation) and
// removes the posting under review via the same path resolvePostingReport
// uses for "remove" -- banning someone without also removing the exact
// content that justified it would leave that content still live.
// toggleUserBan is a true toggle, so this only invokes it when the
// author isn't already banned, never accidentally unbanning them.
export async function banPostingAuthor(input: BanPostingAuthorInput): Promise<BanPostingAuthorResult> {
  await requireRole("moderator");

  const parsed = banPostingAuthorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [posting] = await db
    .select({ id: postings.id, hostId: postings.hostId })
    .from(postings)
    .where(eq(postings.id, parsed.data.postingId));
  if (!posting) {
    return { success: false, error: "Posting not found." };
  }

  const [author] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, posting.hostId));
  if (!author) {
    return { success: false, error: "Author not found." };
  }

  if (!author.bannedAt) {
    const banResult = await toggleUserBan({ userId: posting.hostId });
    if (!banResult.success) {
      return banResult;
    }
  }

  return resolvePostingReport({ postingId: parsed.data.postingId, resolution: "remove" });
}
