# Phase 1 Data Model: Blocked Users

## Blocks (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `blockerId` | uuid, not null, references `user.id` | Who initiated the block. |
| `blockedId` | uuid, not null, references `user.id` | Who was blocked. |
| `createdAt` | timestamp, not null, default now | |
| `unblockedAt` | timestamp, nullable | Set on unblock (ADR 0005 — not hard-deleted; a block has real trust/safety history value, unlike `SavedListing`/`UserGame`'s scoped exception). |

A block is "active" when `unblockedAt IS NULL`. Every other feature's
enforcement logic (Home, Browse, Listing detail, future Inbox/Forum)
should query active blocks in both directions (either party may have
blocked the other) to decide mutual visibility/interaction — this
feature only defines the table and the block/unblock actions, not that
enforcement (spec.md's FR-011, Assumptions).

A partial-unique constraint (or equivalent application-level check) on
`(blockerId, blockedId)` where `unblockedAt IS NULL` prevents a
duplicate active block from the same user against the same target.

## Reports (new table — this feature's first writer)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `reporterId` | uuid, not null, references `user.id` | |
| `targetType` | text, not null | One of `user` \| `posting` \| `forum` \| `message` (`guidelines.md`'s documented shape) — this feature only ever writes `user`. |
| `targetId` | uuid, not null | The reported entity's id (a `user.id` for this feature's own writes). |
| `reason` | text, nullable | This feature never sets it (no reason taxonomy collected — spec.md's Assumptions); left for the future Notifications & Report feature's own richer report flow to populate. |
| `status` | text, not null, default `open` | Notifications & Report owns every transition beyond the default; this feature never changes it after insert. |
| `createdAt` | timestamp, not null, default now | |

No relationships beyond `reporterId`/`targetId` are needed for this
feature's own scope.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| search query (list + pick step) | `z.string().max(100).optional()` |
| block target (`blockedId`) | `z.string().uuid()`, refined: must not equal the acting user's own id (self-block rejection, research.md #3) |
| `alsoReport` | `z.boolean().default(false)` |

## State notes

- `blocks.unblockedAt` transitions null → timestamp exactly once per
  row (re-blocking after an unblock creates a **new** row rather than
  clearing `unblockedAt` on the old one, keeping each block/unblock
  cycle as its own legible record).
- `reports.status` is written once as `open` and never transitioned by
  this feature — only a future moderation feature changes it.
