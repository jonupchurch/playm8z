# Phase 1 Data Model: Admin Dashboard

## AuditEntry (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `actorId` | uuid, nullable, references `user.id` | Null for system-generated entries. |
| `action` | text, not null | Short description (e.g., "removed a posting"). |
| `category` | text, not null | `moderation` \| `content` \| `access` \| `system` (`guidelines.md`'s documented shape). |
| `targetType` | text, nullable | e.g. `posting`, `forumThread`, `user` — free-text, not a strict enum, since future writers may reference varied target kinds. |
| `targetId` | uuid, nullable | |
| `targetLabel` | text, nullable | A human-readable label for display (e.g. a posting's title) captured at write time, so the feed doesn't need to re-join/lookup deleted-or-changed targets later. |
| `reason` | text, nullable | |
| `meta` | jsonb, nullable | Small structured detail blob, shape left to each future writer. |
| `createdAt` | timestamp, not null, default now | |

Append-only — no soft-delete concern (ADR 0005 doesn't apply in
reverse; entries are never removed once written, by design, since this
is itself the project's audit trail).

## Read-only aggregates (no new tables)

| Query | Source | Shape |
|---|---|---|
| Total users | `user` | `COUNT(*)` |
| Active today | `postings`/`applications`/`forumThreads`/`forumReplies`/`messages` | `COUNT(DISTINCT userId)` unioned across each table's today's rows (research.md #1) |
| New signups today | `user` | `COUNT(*) WHERE createdAt` is today |
| Live postings | `postings` | `COUNT(*) WHERE status = 'open'` |
| Open reports | `reports` (`008`) | `COUNT(*) WHERE status = 'open'` |
| 7-day chart (Signups/Active/Postings) | same tables as above | grouped by day, last 7 days |
| Needs-attention | `reports` (`008`) | `COUNT(*) WHERE status = 'open' GROUP BY targetType` |
| Top games | `postings` | `COUNT(*) WHERE status = 'open' GROUP BY game`, top 5 |

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `action`/`category`/`targetLabel`/`reason` (log-audit-entry input) | `z.string()` with reasonable length caps, matching other free-text fields in this project |
| `meta` | `z.record(z.unknown()).optional()` |

No `searchParams`/form input exists on this feature's own page beyond
the client-side metric-switcher tab (not a trust boundary — it only
selects which already-computed dataset to display, per plan.md).

## State notes

- `auditEntries` is append-only; this feature never updates or deletes
  a row once written.
