import { and, eq } from "drizzle-orm";
import type { db } from "@/db";
import { likes } from "@/db/schema";

// The transaction handle drizzle passes to db.transaction(async (tx) => ...).
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// When a content row is HARD-deleted -- the owner-only exception to ADR 0005's
// no-hard-delete rule (041/ADR 0014) -- its FK-less polymorphic references have
// to be cleaned up by hand: they name the row by (targetType, targetId) with no
// foreign key, so nothing cascades. This is the single, documented decision for
// WHICH of those tables get purged, so the next hard-delete type (postings,
// threads, ...) inherits it instead of re-deriving it and forgetting one.
//
// PURGED (disposable -- worthless once the target is gone):
//   - `likes` -- a like is a bare UI relationship with no standalone value, the
//     same reasoning ADR 0005 uses to allow hard-deleting likes/SavedListing/
//     UserGame outright.
//
// DELIBERATELY NOT purged (these are meant to OUTLIVE their target):
//   - `auditEntries` -- the audit trail itself; the hard-delete is *recorded*
//     there (targetId is a value, not an FK), so the entry must survive.
//   - `warnings` -- append-only moderation record (ADR 0005); a warning keeps its
//     trust/safety value even when the warned-about content is gone.
//   - `reports` -- moderation history (status/reason/details). Preserved by
//     default. A future hard-delete type that wants a deleted target's reports
//     removed from the moderation queue must make that call consciously (ADR
//     0005) and extend this helper -- it is not an oversight that they stay.
//
// Call INSIDE the same transaction as the row delete, before or after it.
export async function purgePolymorphicRefs(
  tx: Transaction,
  targetType: string,
  targetId: string,
): Promise<void> {
  await tx.delete(likes).where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));
}
