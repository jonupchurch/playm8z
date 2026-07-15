import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forumReplies, forumThreads } from "@/db/schema";

// Shared by every consumer that only has a bare `reports.targetId` for
// a `targetType = 'forum'` row and needs to know which of 018's two
// tables it actually belongs to -- Admin Reports (019) is the first
// real need for this (its own `reports` rows don't distinguish thread
// vs. reply at the row level, unlike 018's own queue/review queries,
// which already know the answer from their own already-typed table
// scans). Checks `forumThreads` first, then `forumReplies`; returns
// null when neither matches (the content no longer exists).
export async function classifyForumTarget(targetId: string): Promise<"forumThread" | "forumReply" | null> {
  const [thread] = await db.select({ id: forumThreads.id }).from(forumThreads).where(eq(forumThreads.id, targetId));
  if (thread) return "forumThread";

  const [reply] = await db.select({ id: forumReplies.id }).from(forumReplies).where(eq(forumReplies.id, targetId));
  if (reply) return "forumReply";

  return null;
}
