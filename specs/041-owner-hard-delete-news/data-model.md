# Data Model: Owner-only permanent delete for news posts

## Schema change: `user.isOwner`

Add one additive column to the existing `user` table:

| column    | type    | notes                                                   |
|-----------|---------|---------------------------------------------------------|
| `isOwner` | boolean | `NOT NULL DEFAULT false`. The standalone owner marker.  |

- Orthogonal to `role` (unchanged). Defaults off for every existing/future row.
- Applied via idempotent `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isOwner"
  boolean NOT NULL DEFAULT false;` to local **and** prod (matches what
  `drizzle-kit` generates, so the deploy-time push sees no diff). Verify by query.
- Provisioned to `true` for the owner (`jonupchurch@gmail.com`) in both
  environments via `scripts/set-owner.ts` (idempotent `UPDATE … WHERE email=`).

## Permanent delete of a news post

- Removes the post plus its engagement, atomically (one transaction):
  - **`savedNewsPosts`** has a real FK to `newsPosts.id` (`onDelete: cascade`,
    schema.ts:779) — its rows go with the post automatically.
  - **`likes`** is POLYMORPHIC (`targetType='newsPost'`, `targetId=postId`, **no
    FK**) — so its rows do NOT cascade and MUST be deleted explicitly, or they
    orphan (FR-007). The action purges them in the same transaction as the post.
- Distinct from the existing soft "Unpublish" (`status='draft'`, row retained) —
  that path is unchanged.

## Audit entry (survives the delete)

- Uses the existing `auditEntries` table via `logAuditEntry`.
- Fields: `actorId` (the owner), `action` = "permanently deleted a news post",
  `category` = "content", `targetType` = "newsPost", `targetId` = the deleted
  post's id (a **value**, not an FK — persists), `targetLabel` = the post title
  (captured before deletion).
- Append-only; unaffected by the post's removal (FR-010).

## Invariants

1. `isOwner` defaults false; only explicit provisioning turns it on (FR-001/SC-006).
2. A permanent delete removes the post from the public feed, the admin list, and
   storage, plus its likes/saves (FR-007/SC-002).
3. The action verifies `isOwner` server-side; a non-owner deletes nothing
   (FR-008/SC-001).
4. Each successful delete writes exactly one audit entry that outlives the post
   (FR-010/SC-003).
5. No role value changes; role-based access is identical to before (FR-003/SC-004).
