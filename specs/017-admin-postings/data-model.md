# Phase 1 Data Model: Admin Postings

## Postings (extends the table from `003-home`, `005-post-game`, `016-admin-users`)

| Field | Type | Notes |
|---|---|---|
| `autoFlagReason` | text, nullable | New. One of `phishing_or_scam` \| `boosting_service` \| `new_account_first_post`. Set once, at creation, by `005`'s amended `create-posting.ts` (research.md #2). Never set or cleared by this feature directly. |
| `moderationReviewedAt` | timestamp, nullable | New. Set by Approve/Warn (research.md #1's queue-membership formula); left null by Remove/Ban since those already exit the queue via the existing `removedAt` (`016`). |

## Reports (extends `008-blocked-users`'s existing table — no schema change)

This feature is the first to transition `status` away from `open`:
Approve/Remove/Warn/Ban-triggered-remove all set `status = 'resolved'`
on every currently-open report where `targetType = 'posting'` and
`targetId` = the acted-on posting (research.md #4).

## Warnings (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | The warned author. |
| `moderatorId` | uuid, not null, references `user.id` | Who issued it. |
| `postingId` | uuid, nullable, references `postings.id` | The posting that prompted it, if any. |
| `reason` | text, nullable | Free-text moderator note. |
| `createdAt` | timestamp, not null, default now | |

"Prior warnings" (this feature's drawer, and Admin Users' `016`
drawer going forward) is `COUNT(*) WHERE userId = <author>`.
Append-only — never updated or deleted (ADR 0005; also simply never
needs to change once written).

## AuditEntry (reused from `015-admin-dashboard` — no schema change)

This feature is `015`'s first real writer: Approve/Remove/Warn each
insert a row (`category = 'moderation'`, `targetType = 'posting'`,
`targetId` = the posting, `targetLabel` = its title,
`actorId` = the moderator). The retroactive amendment to `016`'s
`toggle-user-ban.ts`/`remove-user-content.ts` (research.md #5) writes
the same way from those two existing actions.

## Queue membership (computed, no new table)

A posting appears in the moderation queue when:

```
removedAt IS NULL
AND (
  EXISTS (SELECT 1 FROM reports WHERE targetType = 'posting'
          AND targetId = postings.id AND status = 'open')
  OR (autoFlagReason IS NOT NULL AND moderationReviewedAt IS NULL)
)
```

Filter "User-reported" narrows to the first disjunct being true;
"Auto-flagged" narrows to postings matching only the second.

## Validation rules (Zod, at the Server Action/`searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `filter` | `z.enum(["all", "reported", "flagged"]).default("all")` |
| `postingId` (resolve/ban actions) | `z.string().uuid()` |
| `resolution` (approve/remove/warn) | `z.enum(["approve", "remove", "warn"])` |
| `warningReason` | `z.string().max(500).optional()` |

## State notes

- `postings.autoFlagReason` is written once, at creation, and never
  changed by this feature (research.md #2).
- `postings.moderationReviewedAt` transitions null → timestamp
  exactly (Approve/Warn); this feature never clears it.
- `postings.removedAt` (reused from `016`) transitions null →
  timestamp exactly (Remove/Ban), same as `016`'s own behavior.
- `reports.status` transitions `open` → `resolved` only, per row,
  triggered by any of this feature's four resolution actions acting
  on that report's target posting.
- `warnings` rows are append-only; a user's warning count only ever
  grows.
- `auditEntries` rows are append-only (established by `015`).
