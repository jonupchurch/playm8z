# Phase 1 Data Model: Moderator audit log

## AuditEntry (reused from `015-admin-dashboard` — no schema change)

This feature is a read-only consumer of the existing shape:
`id`, `actorId` (nullable — null renders as "System"), `action`,
`category` (`moderation`\|`content`\|`access`\|`system`), `targetType`,
`targetId`, `targetLabel`, `reason`, `meta` (jsonb), `createdAt`.

## Validation rules (Zod, at the `searchParams` boundary — Principle II)

| Field | Rule |
|---|---|
| `q` (search) | `z.string().max(200).optional()` |
| `actor` | `z.string().max(100).default("all")` — `"all"` or a matched actor's display name/id |
| `category` | `z.enum(["all", "moderation", "content", "access", "system"]).default("all")` |
| `page` | `z.coerce.number().int().min(1).default(1)` |

## Day grouping (computed, no new columns)

`createdAt` compared against the current date to bucket each entry
into `Today` / `Yesterday` / `Earlier` (research.md #4).

## CSV export shape (no new entity)

One row per matching `auditEntries` row (post-filter), columns:
`createdAt`, `actor` (resolved display name or "System"), `action`,
`category`, `targetType`, `targetLabel`, `reason`, `meta` (serialized
as JSON text within the CSV cell).

## State notes

- `auditEntries` remains append-only (established by `015`) — this
  feature never inserts, updates, or deletes a row.
- No new writer is introduced by this feature itself beyond the two
  bounded retroactive amendments (`020`, `021`) documented in
  research.md #2.
