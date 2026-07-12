# Phase 1 Data Model: Inbox / messaging

## Conversations (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `isGroup` | boolean, not null, default false | |
| `name` | text, nullable | Group chats only; direct conversations display the other member's name instead. |
| `memberIds` | uuid[], not null | References `user.id`, not enforced as a foreign-key array by Postgres itself — validated at the application layer. |
| `lastMessageAt` | timestamp, not null, default now | Used for conversation-list ordering. |
| `createdAt` | timestamp, not null, default now | |

A direct (non-group) conversation between the same two users is never
duplicated — `start-conversation.ts` checks for an existing one first
(research.md's established reuse behavior, FR-005).

## Messages (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `conversationId` | uuid, not null, references `conversations.id` | |
| `senderId` | uuid, nullable, references `user.id` | Null for system messages (e.g., "You accepted — X joined the party"). |
| `type` | text, not null, default `text` | `text` \| `system`. |
| `body` | text, not null | |
| `createdAt` | timestamp, not null, default now | |

No soft-delete concern surfaces in this feature's own scope — messages
are never removed here.

## Merged inbox list (derived, not stored)

`get-inbox-list.ts` unions two sources into one list, sorted by most
recent activity:
- Real `conversations` where the current user is in `memberIds`.
- `applications` with `status = 'pending'` on a `postings` row this
  user hosts, presented as a "request" list item using the
  Application's own `message` field as its preview/opening line — no
  `conversations`/`messages` row exists for these until accepted
  (research.md #1).

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `body` (message) | `z.string().trim().min(1).max(2000)` |
| `recipientIds` (start conversation) | `z.array(z.string().uuid()).min(1).max(20)` |
| `groupName` | `z.string().max(60).optional()` |
| `conversationId`/`applicationId` (accept/decline/send) | `z.string().uuid()` |

## State notes

- `applications.status` gains its final transitions here: `pending` →
  `accepted` (this feature, atomically alongside `postings.seatsOpen`/
  `status` and a new `conversations` row) or `pending` → `declined`
  (this feature, no other side effects). `withdrawn` remains
  applicant-only (`006-listing-detail`).
- `postings.seatsOpen` decrements exactly once per accepted Application,
  and `postings.status` flips to `full` the moment it reaches zero —
  never decremented for a merely-pending or declined Application.
- `conversations.lastMessageAt` updates on every new message; `messages`
  rows are otherwise append-only.
