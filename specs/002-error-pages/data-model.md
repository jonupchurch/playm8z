# Phase 1 Data Model: Error Pages

## Settings (new table)

A minimal, singleton configuration table — this feature only reads it;
the future Admin Settings feature (`guidelines.md` §12.6) owns writing
to it and will extend this same table with its other toggles (auto-flag
rules, feature flags, roles, etc.) rather than this feature inventing a
shape that gets replaced later (research.md #2).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | Singleton in practice — the app always reads the one existing row (or a hardcoded default if none exists yet, e.g. immediately after this migration runs and before any row is manually inserted). |
| `maintenanceMode` | boolean, not null, default `false` | Read every non-admin request via `proxy.ts` (through a short-TTL cache, research.md #2). Written only via a manual `db:studio`/SQL update until Admin Settings ships a real toggle. |
| `maintenanceMessage` | text, nullable | Optional estimated-return message (FR-011). `null` → the maintenance page shows the generic "back shortly" copy instead. |

No relationships to other tables. No soft-delete concern (ADR 0005) —
this is a configuration row, not a user-facing record that gets
disabled/removed.

## Error reference code

Not a stored entity. Uses Next.js's auto-generated `error.digest` (a
per-error hash, see research.md #1) directly as the reference code
shown on the 500 page — this feature does not generate or persist its
own identifier.

## Validation rules (Zod, at the read boundary — Principle II)

| Field | Rule |
|---|---|
| `maintenanceMode` | `z.boolean()` — the settings-read accessor (`get-settings.ts`) validates the shape of whatever comes back from the database before use, rather than assuming it matches, even though the source is admin-authored config rather than end-user input. |
| `maintenanceMessage` | `z.string().nullable()` |

## State notes

- `maintenanceMode` has no transition history/audit trail in this
  feature — when Admin Settings adds its own toggle UI, logging that
  change to the moderation audit log (`guidelines.md` §12.7) is that
  feature's concern, not this one's.
- The settings row is expected to always exist (seeded by this
  feature's migration with the defaults above) so `get-settings.ts`
  never has to handle a "no row yet" case as anything other than "use
  the defaults."
