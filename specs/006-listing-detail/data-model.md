# Phase 1 Data Model: Listing detail

## Applications (new table — this feature is its first writer)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `postingId` | uuid, not null, references `postings.id` | |
| `applicantId` | uuid, not null, references `user.id` | |
| `message` | text, nullable | Optional, per spec Assumptions. |
| `status` | text, not null, default `pending` | One of `pending` \| `accepted` \| `declined` \| `withdrawn` (research.md #5 — extends `guidelines.md`'s originally-suggested three values). |
| `createdAt` | timestamp, not null, default now | |

A unique constraint on `(postingId, applicantId)` where `status IN
('pending', 'accepted')` prevents a second concurrent active
application from the same user to the same posting (they can re-apply
only after withdrawing or being declined) — enforced at the Server
Action level (an application-status check before insert), not
necessarily a database constraint, since Drizzle's partial-unique-index
support varies by setup and the check is cheap to do in application
code either way.

## Questions (new table — this feature introduces it)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `postingId` | uuid, not null, references `postings.id` | |
| `askerId` | uuid, not null, references `user.id` | |
| `text` | text, not null | The question itself. |
| `reply` | text, nullable | Set only by the listing's host (`reply-to-question.ts`'s ownership check). |
| `repliedAt` | timestamp, nullable | Set alongside `reply`. |
| `createdAt` | timestamp, not null, default now | |

One reply per question (matches the wireframe — a question either has
a reply or it doesn't; no threaded follow-ups). No soft-delete concern
(ADR 0005) — questions/replies are never removed by this feature.

## Roster (derived, not stored)

Computed per request from `postings` (for `hostId`, `seatsTotal`) plus
`applications` where `status = 'accepted'`:

- Row 1: the host (always present, tagged "Host").
- One row per accepted application (tagged "Member").
- `seatsTotal - 1 - acceptedCount` dashed "Open" rows.

No role/class label anywhere (ADR 0004, research.md #1).

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `message` (apply) | `z.string().max(500).optional()` |
| `text` (question) | `z.string().trim().min(1).max(300)` |
| `reply` | `z.string().trim().min(1).max(500)` |

## State notes

- `applications.status` transitions this feature performs: (none) →
  `pending` (apply), `pending` → `withdrawn` (withdraw, applicant
  only). `pending` → `accepted`/`declined` are Inbox/messaging's
  transitions, out of this feature's scope (spec Assumptions).
- `questions.reply`/`repliedAt` transition null → set exactly once, by
  the listing's host only (`reply-to-question.ts`'s ownership check).
