"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { blocks } from "@/db/schema";
import { requireVerifiedEmail } from "@/lib/auth/require-verified-email";

export type UnblockResult = { success: true } | { success: false; error: string };

// FR-004/FR-007: only the original blocker can unblock; sets
// unblockedAt (never hard-deleted, ADR 0005 -- a block has real
// trust/safety history value).
export async function unblockUser(blockId: string): Promise<UnblockResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Not authenticated." };
  }

  const result = await db
    .update(blocks)
    .set({ unblockedAt: new Date() })
    .where(and(eq(blocks.id, blockId), eq(blocks.blockerId, user.id), isNull(blocks.unblockedAt)))
    .returning({ id: blocks.id });

  if (result.length === 0) {
    return { success: false, error: "That block wasn't found." };
  }

  return { success: true };
}
