# Phase 1 Data Model: Admin Forum

## ForumThread (extends the table from `009-forum-index`, `016-admin-users`)

| Field | Type | Notes |
|---|---|---|
| `autoFlagReason` | text, nullable | New. Shared 3-code taxonomy with `postings` (research.md #3). Set at creation by `009`'s amended `create-thread.ts`. |
| `moderationReviewedAt` | timestamp, nullable | New. Set by Approve/Warn (same pattern as `017`'s `postings.moderationReviewedAt`). |
| `lockedAt` | timestamp, nullable | New. Set by "🔒 Lock thread." A locked thread's `010` `post-reply.ts` rejects new replies (research.md #6). |

Reuses `removedAt` from Admin Users (`016`).

## ForumReply (extends the table from `010-forum-thread`)

| Field | Type | Notes |
|---|---|---|
| `autoFlagReason` | text, nullable | New. Same shared taxonomy, set at creation by `010`'s amended `post-reply.ts`. |
| `moderationReviewedAt` | timestamp, nullable | New. Same pattern. |
| `removedAt` | timestamp, nullable | New — `016` never extended this table. Set by "Remove reply." `010`'s `get-thread.ts` excludes rows where this is set from a thread's reply list. |

## Reports (extends `008-blocked-users`'s existing table — no schema change)

Filtered to `targetType = 'forum'`; `targetId` classified against
`forumThreads` then `forumReplies` (research.md #1). This feature
transitions matched open rows' `status` to `resolved`, same mechanism
`017` introduced (no second status value).

## Warnings (generalizes `017-admin-postings`'s table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | Unchanged. |
| `userId` | uuid, not null, references `user.id` | Unchanged. |
| `moderatorId` | uuid, not null, references `user.id` | Unchanged. |
| `targetType` | text, nullable | **Changed** from `017`'s `postingId` — one of `posting` \| `forumThread` \| `forumReply`. |
| `targetId` | uuid, nullable | **Changed** from `017`'s `postingId` — an id from whichever table `targetType` names. |
| `reason` | text, nullable | Unchanged. |
| `createdAt` | timestamp, not null, default now | Unchanged. |

"Prior warnings" (Admin Postings' `017` and this feature's own drawer)
is `COUNT(*) WHERE userId = <author>` — unchanged query shape, now
correctly spanning every source. `017`'s `resolve-posting-report.ts`
is amended to write `targetType = 'posting', targetId = <posting id>`
instead of the old `postingId` column (research.md #4).

## AuditEntry (reused from `015-admin-dashboard` — no schema change)

This feature is `015`'s second real writer (Approve/Remove/Lock/Warn)
and its first real *reader* for a live stat — "actioned today"
(research.md #5): `COUNT(*) WHERE category = 'moderation' AND
targetType IN ('forumThread', 'forumReply') AND createdAt` is today.

## Queue membership (computed, no new table)

A thread or reply appears in the moderation queue when:

```
removedAt IS NULL
AND (
  EXISTS (SELECT 1 FROM reports WHERE targetType = 'forum'
          AND targetId = <thread or reply id> AND status = 'open')
  OR (autoFlagReason IS NOT NULL AND moderationReviewedAt IS NULL)
)
```

Filter "Threads"/"Replies" narrows by content type; "Auto-flagged"
narrows to items with an unreviewed auto-flag reason (matching the
wireframe's own filter semantics, which do not include a separate
"User-reported" tab for this feature).

## Validation rules (Zod, at the Server Action/`searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `filter` | `z.enum(["all", "threads", "replies", "flagged"]).default("all")` |
| `targetType` (resolve/ban actions) | `z.enum(["forumThread", "forumReply"])` |
| `targetId` | `z.string().uuid()` |
| `resolution` (approve/remove/lock/warn) | `z.enum(["approve", "remove", "lock", "warn"])` |
| `warningReason` | `z.string().max(500).optional()` |

## State notes

- `forumThreads`/`forumReplies`' `autoFlagReason` written once, at
  creation, never changed by this feature.
- `moderationReviewedAt` transitions null → timestamp exactly
  (Approve/Warn); never cleared by this feature.
- `removedAt` (thread: reused `016`; reply: new) transitions null →
  timestamp exactly (Remove/Ban).
- `forumThreads.lockedAt` transitions null → timestamp exactly (Lock);
  this feature never unlocks a thread (not offered by the wireframe).
- `reports.status` transitions `open` → `resolved` only, per row,
  triggered by any of this feature's resolution actions.
- `warnings` rows are append-only, now written with the generalized
  `targetType`/`targetId` shape by both this feature and (after its
  amendment) `017`.
- `auditEntries` rows are append-only (established by `015`).
