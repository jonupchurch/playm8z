# Phase 1 Data Model: Admin Reports

## Reports (extends `008-blocked-users`'s existing table — retroactive amendment)

| Field | Type | Notes |
|---|---|---|
| `resolvedAt` | timestamp, nullable | New (research.md #5). Retroactively set by `017`'s and `018`'s existing resolve actions alongside `status = 'resolved'`; set directly by this feature's own `dismiss-report.ts`/`resolve-report-action.ts` for profile/message targets. |

Grouped by `(targetType, targetId)` for queue display (research.md
#1) — the earliest-`createdAt` open row per group is the
"representative" reporter/note; the group's count is every currently-
open row against that same target.

## Messages (extends `011-inbox-messaging`'s existing table)

| Field | Type | Notes |
|---|---|---|
| `removedAt` | timestamp, nullable | New (research.md #4). Set by this feature's "Remove content" for a message-target report. `011`'s conversation-view query excludes rows where this is set. |

## Warnings (further generalizes `017`/`018`'s table — no schema change)

`targetType` already allows `posting` \| `forumThread` \| `forumReply`
(from `018`); this feature is the first to also write `message` or
leave `targetType`/`targetId` both `null` (a profile-target warning —
already-nullable columns, no schema change needed).

## AuditEntry (reused from `015-admin-dashboard` — no schema change)

Posting/forum delegation paths already log through `017`'s/`018`'s
own actions. This feature's own message/profile Remove/Warn/Ban paths
call `logAuditEntry()` directly (`category = 'moderation'`,
`targetType` = `'message'` or `'user'`).

## Computed: cross-source "total reports" (research.md #3)

No new table. `getTotalReportsForUser(userId)`:

```
COUNT(*) FROM reports WHERE
  (targetType = 'user' AND targetId = userId)
  OR (targetType = 'posting' AND targetId IN
      (SELECT id FROM postings WHERE hostId = userId))
  OR (targetType = 'forum' AND targetId IN
      (SELECT id FROM forumThreads WHERE authorId = userId
       UNION SELECT id FROM forumReplies WHERE authorId = userId))
  OR (targetType = 'message' AND targetId IN
      (SELECT id FROM messages WHERE senderId = userId))
```

Counts every report ever filed (open or resolved) — a lifetime total,
matching the wireframe's own seed data (the same value shown across
two different target-type cards for the same user).

## Computed: severity (reused/corrected `reason-severity.ts`)

`impersonation` corrected from medium to high (research.md #6). Full
mapping after this feature: `underage`/`harassment`/`impersonation` →
high, `inappropriate`/`spam` → med, `other` → low. No schema change —
this is a code-level correction to the shared helper `018` extracted.

## Validation rules (Zod, at the Server Action/`searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `filter` | `z.enum(["all", "posting", "forum", "user", "message"]).default("all")` |
| `targetType` (resolve/ban actions) | `z.enum(["posting", "forum", "user", "message"])` |
| `targetId` | `z.string().uuid()` |
| `warningReason` | `z.string().max(500).optional()` |

## State notes

- `reports.status` transitions `open` → `resolved` only (unchanged
  from `017`/`018`); this feature's Dismiss and its own message/profile
  Remove/Warn paths also perform this transition, now alongside
  `resolvedAt`.
- `reports.resolvedAt` is written once per row, alongside `status`,
  never cleared.
- `messages.removedAt` transitions null → timestamp exactly (Remove);
  this feature never un-removes a message.
- `warnings` rows remain append-only; this feature's own writes use
  `targetType = 'message'` or `null` where no dedicated action exists.
