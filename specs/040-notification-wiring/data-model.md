# Data Model: Notification Wiring

No schema migration. This feature adds **producers** of existing records and one
new value in a free-text type column.

## Existing table touched: `notifications`

Unchanged shape (`src/db/schema.ts`):

| column      | notes                                                            |
|-------------|------------------------------------------------------------------|
| `id`        | uuid pk                                                          |
| `userId`    | recipient; FK → users, `onDelete: cascade`                       |
| `type`      | text; this feature adds `declined` to the produced set          |
| `actorId`   | FK → users nullable; always set by this feature (the causer)    |
| `text`      | human-readable predicate (see below)                            |
| `targetRef` | in-app link path                                                |
| `read`      | boolean default false — new rows start unread                   |
| `createdAt` | timestamp default now                                           |

No `ALTER`. `type` is `text` (not a DB enum), so `declined` needs no migration —
only the TypeScript `NotificationType` union and the two display maps change.

## Records produced

Four producers, all best-effort. Recipient/actor/text/targetRef per event:

### `reply` — post-reply.ts
- **When**: a reply is saved and the replier ≠ the thread author, and no active
  block exists between them.
- **Recipient**: thread author. **Actor**: replier.
- **text**: `replied to your thread “{threadTitle}”`
- **targetRef**: `/forum/thread/{threadId}`

### `mention` — post-reply.ts and create-thread.ts
- **When**: the saved thread/reply body contains `@handle` tokens that resolve to
  existing users, excluding the actor and (for replies) the thread author, and
  excluding any user in an active block relationship with the actor.
- **Recipient**: each such mentioned user (deduped). **Actor**: the poster.
- **text**: `mentioned you in “{threadTitle}”`
- **targetRef**: `/forum/thread/{threadId}`

### `accepted` — accept-request.ts
- **When**: an **applicant-initiated** request is accepted (`initiatedBy !==
  "host"`), and no active block between host and applicant.
- **Recipient**: applicant. **Actor**: host (the acting user).
- **text**: `accepted your request to join {game} · {title}`
- **targetRef**: `/listing/{postingId}`
- **Seam**: created strictly after the status/seat/conversation transaction
  commits.

### `declined` — decline-request.ts (NEW type)
- **When**: an **applicant-initiated** request is declined (`initiatedBy !==
  "host"`), and no active block between host and applicant.
- **Recipient**: applicant. **Actor**: host (the acting user).
- **text**: `declined your request to join {game} · {title}`
- **targetRef**: `/listing/{postingId}`

## Transient (not stored): mention token

Parsed from body text at write time; never persisted.
- **Grammar**: `@` + `[A-Za-z][A-Za-z0-9]{0,23}`, not preceded by `[A-Za-z0-9]`.
- **Resolution**: case-insensitive match to `users.handle`; unknown → dropped.
- **Dedup**: case-insensitive, so one notification per distinct real user.

## Dedup & suppression rules (invariants)

1. **At most one notification per recipient per post.** Reply-author excluded
   from the mention pass ⇒ author gets `reply` not both. Parser dedupes repeated
   handles.
2. **Self-exclusion.** Actor never notified (self-reply, self-mention).
3. **Block suppression.** `hasActiveBlockBetween(actor, recipient)` ⇒ no row, for
   every recipient type.
4. **No host duplication.** Applicant-facing accepted/declined target the
   applicant only; the host's synthesized request view is never written to and
   never doubled.

## Type mapping changes

- `NotificationType` union (`create-notification.ts`): add `"declined"`.
- `categoryOf` (`filter-notifications.ts`): `"declined"` → `"requests"`.
- `TYPE_ICON` (`notifications-list.tsx`): add `declined: { icon: "✕", bg: <muted red> }`.
