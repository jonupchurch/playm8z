"use server";

import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireVerifiedEmail, UnverifiedEmailError } from "@/lib/auth/require-verified-email";
import { reportForumContentSchema, type ReportForumContentInput } from "@/lib/validations/forum-thread";

export type ReportForumContentResult = { success: true } | { success: false; error: string };

// FR-009: this feature's second writer of Blocked Users' `reports`
// table (research.md #3) -- targetType is always the literal 'forum'
// regardless of whether targetId is a thread or a reply id; still no
// review/queue UI (Notifications + Report's eventual job).
export async function reportForumContent(input: ReportForumContentInput): Promise<ReportForumContentResult> {
  let user: { id: string };
  try {
    user = await requireVerifiedEmail();
  } catch (err) {
    if (err instanceof UnverifiedEmailError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "You must be logged in to report this." };
  }

  const parsed = reportForumContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(reports).values({ reporterId: user.id, targetType: "forum", targetId: parsed.data.targetId });

  return { success: true };
}
