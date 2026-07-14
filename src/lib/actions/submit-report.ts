"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { blocks, reports } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { submitReportSchema, type SubmitReportInput } from "@/lib/validations/notifications";

export type SubmitReportResult = { success: true; alsoBlocked: boolean } | { success: false; error: string };

// FR-006/FR-007/FR-008: the canonical report flow's submission -- one
// `reports` row (real `reason`, per data-model.md, and any free-text
// `details`), and, when "Also block" is checked and the caller
// supplied a `blockUserId`, one `blocks` row in the same submission
// (reusing Blocked Users' own block-creation shape/guards, research.md
// #3). `blockUserId` is deliberately decoupled from `targetId` --
// reporting a posting targets the posting itself, but blocking targets
// the *person* behind it (the host), which report-modal.tsx supplies
// separately when it knows who that is. Requires authentication +
// email verification like every other write action; an unverified
// session's specific message is surfaced so the caller can route to a
// "verify your email" state (FR-008) rather than a generic error.
export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to report this." };
  }

  const parsed = submitReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { targetType, targetId, reason, details, alsoBlock, blockUserId } = parsed.data;

  if (targetType === "user" && targetId === user.id) {
    return { success: false, error: "You can't report yourself." };
  }

  await db.insert(reports).values({
    reporterId: user.id,
    targetType,
    targetId,
    reason,
    details: details ?? null,
  });

  let alsoBlocked = false;
  if (alsoBlock && blockUserId && blockUserId !== user.id) {
    const [existing] = await db
      .select({ id: blocks.id })
      .from(blocks)
      .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, blockUserId), isNull(blocks.unblockedAt)));

    if (!existing) {
      await db.insert(blocks).values({ blockerId: user.id, blockedId: blockUserId });
    }
    alsoBlocked = true;
  }

  return { success: true, alsoBlocked };
}
