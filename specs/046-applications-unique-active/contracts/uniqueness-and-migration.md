# Contracts: active-application uniqueness, conflict-safe writes, migration

Internal seams. No HTTP/UI contract change; both actions keep their result types and messages.

## `dedupeActiveApplications(): Promise<{ groups: number; deleted: number }>`

`src/lib/applications/dedupe-active-applications.ts` (pure `planDedupe(rows)` + DB wrapper)

- Groups ACTIVE rows (`status IN ('pending','accepted')`) by `(postingId, applicantId)`; for any group >1,
  keeps the winner and deletes the rest by `id`.
- **Winner**: `accepted` over `pending`; tie-broken by oldest `createdAt`, then smallest `id`.
- Returns `{ groups: #groups-with-dups, deleted: #rows-removed }`. Idempotent (second run → `{0,0}`).
- Never touches terminal (declined/withdrawn) rows.

## `applyToPosting` / `inviteToParty` — conflict-safe (contracts otherwise unchanged)

- Keep the existing active-application select-check (fast path + friendly message).
- INSERT becomes `.onConflictDoNothing().returning({ id })`. If the returned array is **empty**, a concurrent
  writer won the race → return the SAME existing friendly failure:
  - apply: `{ success:false, error:"You already have an active application to this listing." }`
  - invite: `{ success:false, error:"This player already has an active application to this party." }`
- A successful insert returns the existing success result. No `23505` parsing needed (returning-empty detects
  the lost race). If a catch were ever added, it must read `err.cause.code` (Drizzle wraps postgres.js errors).

## Migration script `scripts/lockdown-applications.ts` and DDL

- Runs `dedupeActiveApplications()` then creates the partial index, idempotently, with verification. Mirrors
  `lockdown-usergames.ts` (guarded `.env.local` load so a prod `DATABASE_URL` is never clobbered). Run local, then prod.
- One-shot idempotent DDL:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS "applications_active_uniq"
    ON "applications" ("postingId", "applicantId") WHERE status IN ('pending','accepted');
  ```
- **Verify**: `SELECT indexname FROM pg_indexes WHERE tablename='applications' AND indexname='applications_active_uniq';` → 1 row.
- **Ordering** (load-bearing): dedup active duplicates → create index. Local first (+ full suite), then prod by
  hand before merge so the deploy's `drizzle-kit push` is a verified near-no-op.

## Deploy-safety contract for the partial index

- After declaring the index in schema, `drizzle-kit push` twice locally MUST report no changes on the second
  run. If it churns (drops/creates the partial index every run, as 043's expression index did), that is
  ACCEPTED — schema-declared means push recreates it, and both writers dedup app-side so the recreate can never
  hit a duplicate. Do NOT SQL-manage it (push would drop an index it doesn't know).
