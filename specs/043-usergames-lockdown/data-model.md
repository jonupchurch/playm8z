# Data Model: Lock down `userGames`

Only two tables are touched. No new tables, no new columns.

## `userGames` (source of truth — unchanged shape, new guarantee)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | generated |
| `userId` | uuid | FK → `users.id`, `ON DELETE CASCADE` (unchanged) |
| `game` | text NOT NULL | free-text name (ADR 0001); stored as entered |
| `rank` | text NULL | optional self-reported |
| `hoursPlayed` | integer NULL | optional self-reported |
| `createdAt` | timestamp | `defaultNow()` |

**New**: a per-player **unique index** over the normalized game name:

```
UNIQUE (userId, lower(btrim(game)))     -- index name: userGames_userId_normgame_uniq
```

- `lower(btrim(game))` ≡ `normalizeGame(game)` (trim → lowercase). Two rows for one player whose names
  normalize equal are now impossible.
- No new *column* (the normalization is an index expression, not stored). `game` still holds the original casing.
- Declared in `src/db/schema.ts` (via Drizzle `uniqueIndex().on(userId, sql\`lower(btrim(game))\`)`) **iff** the
  drizzle-kit-push double-run idempotency gate passes (research.md #2); otherwise SQL-managed with a schema comment.

**Pre-condition**: all pre-existing duplicate groups collapsed by `dedupeUserGames()` before the index is created,
keeping the most-detailed row per `(userId, normalized game)` (research.md #3). Without this, index creation fails.

### Write paths after this feature (all cannot produce a duplicate)

| Path | Dedup today | After 043 |
|------|-------------|-----------|
| `addUserGame` (profile add) | none (bare insert) | app-side check + `onConflictDoNothing()`; dup add → benign "already in your list" |
| `syncOnboardingGames` (onboarding) | normalizeGame set-sync | unchanged (already safe) + DB backstop |
| `importSteamLibrary` | normalizeGame vs existing | unchanged (already safe) + DB backstop |
| `backfillUserGames` (042 one-time) | dedupeGameNames | **removed** (reads the dropped column; migration complete) |

## `users` (column removed)

| Field | Change |
|-------|--------|
| `gamesPlayed` (`text[]`) | **DROPPED** — retired since 042, no readers/writers, data already migrated to `userGames`. Removed from DB (local + prod) and from the schema definition. |

All other `users` columns unchanged.

## Retired code (consumers of the dropped column)

- `src/lib/games/backfill-user-games.ts` + `scripts/backfill-user-games.ts` + `backfill-user-games.test.ts` — deleted.
  The one-time seed-empty-only migration (042) has run on local + prod; its only input was `users.gamesPlayed`.

## Validation rules (unchanged)

- `userGameSchema` (Zod) still validates `addUserGame` input (game name non-empty, optional rank/hours).
- `gamesPlayedSchema` / onboarding client contract unchanged — the wizard still submits game *names*; 042 already
  routes them into `userGames`. Only the DB column they never reach anymore is removed.
