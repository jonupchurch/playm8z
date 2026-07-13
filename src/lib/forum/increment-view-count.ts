import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { forumThreads } from "@/db/schema";

// FR-005: increments by one per page load, no per-visitor
// deduplication -- a simple counter, not real analytics.
export async function incrementViewCount(threadId: string): Promise<void> {
  await db
    .update(forumThreads)
    .set({ viewCount: sql`${forumThreads.viewCount} + 1` })
    .where(eq(forumThreads.id, threadId));
}
