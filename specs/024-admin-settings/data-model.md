# Phase 1 Data Model: Admin Settings

## Settings (extends `002-error-pages`'s existing singleton table)

| Field | Type | Notes |
|---|---|---|
| `siteName` | text, not null, default `playm8z` | New. No current reader (research.md's General-section note). |
| `tagline` | text, nullable | New. Same. |
| `supportEmail` | text, nullable | New. Same. |
| `defaultTheme` | text, not null, default `dark` | New. `dark` \| `light`. No current reader. |
| `phraseFilterEnabled` | boolean, not null, default `true` | New. Read by `auto-flag-rules.ts` (`017`/`018`). |
| `linkFilterEnabled` | boolean, not null, default `true` | New. Same. |
| `boostFilterEnabled` | boolean, not null, default `true` | New. Same. |
| `newAccountReviewEnabled` | boolean, not null, default `true` | New. Same. |
| `bannedPhrases` | text[], not null, default a small starter list | New. Read by `auto-flag-rules.ts` instead of its own hardcoded list. |
| `autoHideEnabled` | boolean, not null, default `false` | New. Gates the computed auto-hide rule (research.md #2). |
| `autoHideThreshold` | integer, not null, default `3` | New. Same. |
| `autoEscalateSeverity` | text, not null, default `high` | New. `low` \| `med` \| `high` — read by `017`/`018`/`019`'s queue queries for the "needs ban review" badge. |
| `discordFlag` | boolean, not null, default `false` | New. Inert (research.md #8). |
| `groupsFlag` | boolean, not null, default `false` | New. Inert. |
| `ratingsFlag` | boolean, not null, default `false` | New. Inert. |
| `forumFlag` | boolean, not null, default `true` | New. Inert. |
| `tabletopFlag` | boolean, not null, default `true` | New. Inert. |
| `openSignups` | boolean, not null, default `true` | New. Read by `001`'s sign-up path. |
| `discoverableByDefault` | boolean, not null, default `true` | New. Read by `001`'s account-creation path to initialize `007`'s per-user `discoverable`. |

Existing (`002`, unchanged): `id`, `maintenanceMode`, `maintenanceMessage`.

## User (extends the existing table — `role` value set grows)

| Field | Type | Notes |
|---|---|---|
| `role` | text, not null, default `user` | Extended value set: `user` \| `support` \| `viewer` \| `moderator` \| `admin`. `support`/`viewer` are new, both below `moderator` for every existing `require-role.ts('moderator')` gate (research.md #5). No other column change. |

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `siteName` | `z.string().trim().min(1).max(60)` |
| `tagline` | `z.string().max(120).optional()` |
| `supportEmail` | `z.string().email().optional()` |
| `defaultTheme` | `z.enum(["dark", "light"])` |
| `maintenanceMode` | `z.boolean()` |
| `maintenanceMessage` | `z.string().max(300).optional()` |
| filter-toggle booleans | `z.boolean()` |
| `bannedPhrases` | `z.array(z.string().trim().min(1).max(60)).max(200)` |
| `autoHideEnabled` | `z.boolean()` |
| `autoHideThreshold` | `z.number().int().min(1).max(20)` |
| `autoEscalateSeverity` | `z.enum(["low", "med", "high"])` |
| feature-flag booleans | `z.boolean()` |
| `openSignups` | `z.boolean()` |
| `discoverableByDefault` | `z.boolean()` |
| `role` (assign-team-role) | `z.enum(["viewer", "support", "moderator", "admin"])` |
| `email` (assign-team-role) | `z.string().email()` |
| `userId` (remove-team-member) | `z.string().uuid()` |

## Computed values (no new columns)

| Value | Source |
|---|---|
| Auto-hide exclusion | `settings.autoHideEnabled AND openReportCount(posting/thread/reply) >= settings.autoHideThreshold` — added to `003`/`004`/`009`'s existing `removedAt IS NULL` queries (research.md #2) |
| "Needs ban review" badge | `computedSeverity(item) >= settings.autoEscalateSeverity` (severity levels ordered `low < med < high`), evaluated in `017`/`018`/`019`'s queue queries (research.md #4) |

## State notes

- `settings` remains a singleton row — this feature only ever updates
  it, never inserts a second row.
- `user.role` transitions freely among its five values, only by an
  admin-level session (`assign-team-role.ts`); removing a team member
  sets it back to `user` (never a ban/deletion, ADR 0005).
- Every settings-save Server Action (any section) writes one
  `auditEntries` row (`015`) alongside its own update.
