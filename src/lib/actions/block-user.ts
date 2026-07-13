"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports, users } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";
import { blockUserSchema } from "@/lib/validations/blocking";

export type BlockResult = { success: true } | { success: false; error: string };

// FR-005/FR-006/FR-008: rejects the acting user's own id and a
// duplicate active block server-side (research.md #3) -- the
// candidate-search UI already excludes both, but that's a UX nicety,
// not the real guard. Optionally inserts one `reports` row
// (targetType='user') alongside the block when "Also report" is
// checked (research.md #4) -- a plain write, no review/queue UI here.
export async function blockUser(input: { blockedId: string; alsoReport?: boolean }): Promise<BlockResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const parsed = blockUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.blockedId === user.id) {
    return { success: false, error: "You can't block yourself." };
  }

  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, parsed.data.blockedId));
  if (!target) {
    return { success: false, error: "That user wasn't found." };
  }

  const [existing] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, parsed.data.blockedId), isNull(blocks.unblockedAt)),
    );
  if (existing) {
    return { success: false, error: "You've already blocked this user." };
  }

  await db.insert(blocks).values({ blockerId: user.id, blockedId: parsed.data.blockedId });

  if (parsed.data.alsoReport) {
    await db.insert(reports).values({
      reporterId: user.id,
      targetType: "user",
      targetId: parsed.data.blockedId,
    });
  }

  return { success: true };
}
