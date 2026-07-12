# Phase 1 Data Model: Notifications + Report modal

## Notifications (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | Who receives it. |
| `type` | text, not null | `join` \| `accepted` \| `reply` \| `mention` \| `message` \| `rating` \| `news` \| `system` (`guidelines.md`'s documented shape). This feature never creates `rating` (research.md, spec.md's Assumptions — no trigger exists). |
| `actorId` | uuid, nullable, references `user.id` | Null for system-originated notifications (e.g., `news`). |
| `text` | text, not null | The notification's body copy. |
| `targetRef` | text, not null | A path the notification links to (e.g., `/listing/<id>`, `/forum/thread/<id>`). |
| `read` | boolean, not null, default false | |
| `createdAt` | timestamp, not null, default now | |

No soft-delete concern surfaces in this feature's own scope —
notifications are never removed here, only marked read.

## Reports (extends `008-blocked-users`'s existing table — no schema change)

This feature is the first to populate `reason` with a real value from
a fixed taxonomy: `spam`, `harassment`, `inappropriate`, `underage`,
`impersonation`, `other`. Blocked Users' and Forum Thread's existing
writes continue to leave it `null`, unaffected by this change.

## Blocks (reused from `008-blocked-users` — no schema change)

`submit-report.ts` optionally inserts a row here (same shape Blocked
Users already defined) when "Also block" is checked during a report.

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `reason` | `z.enum(["spam", "harassment", "inappropriate", "underage", "impersonation", "other"])` |
| `details` | `z.string().max(1000).optional()` |
| `alsoBlock` | `z.boolean().default(false)` |
| `targetType` (report) | `z.enum(["user", "posting", "forum", "message"])` (`reports.targetType`'s existing enum) |
| `targetId` | `z.string().uuid()` |
| `notificationId` (mark-read) | `z.string().uuid()` |

## State notes

- `notifications.read` transitions false → true only, per-row
  (`mark-notification-read.ts`) or in bulk (`mark-all-read.ts`) —
  never reverts to unread from this feature's own actions.
- `reports.status` is written once as `open` (reusing `008`'s
  default) and never transitioned by this feature.
