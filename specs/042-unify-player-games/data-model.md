# Data Model: One home for a player's games

No schema change. No new column, no constraint, no drop.

## The two stores

| Store | Shape | After this feature |
|-------|-------|--------------------|
| `userGames` (table) | `{ id, userId FK cascade, game text, rank text?, hoursPlayed int?, createdAt }` | **Single source of truth.** Read by profile, matching, public profile; now ALSO written by onboarding. |
| `users.gamesPlayed` (text[]) | array of game names | **Deprecated.** No readers/writers after this feature; kept in place with a "retired" comment (not dropped). |

- `userGames` has **no unique constraint**; dedup is by `normalizeGame(name)` =
  `name.trim().toLowerCase()` in application code (matching `steam-import.ts`).

## Onboarding reconcile (`syncOnboardingGames(userId, names)`)

Given a user and the selected game names:
1. `desired` = names mapped to `{ normalized: normalizeGame(name), name }`, deduped
   by `normalized` (first occurrence's display name wins).
2. `existing` = the user's current `userGames` rows `{ id, game, normalized }`.
3. **Insert** each `desired` whose `normalized` is not in `existing` → `userGames`
   row `{ userId, game: name, rank: null, hoursPlayed: null }`.
4. **Delete** each `existing` row whose `normalized` is not in `desired` (by id,
   scoped to `userId`).
5. Never writes `users.gamesPlayed`.

Idempotent per submission (same selection → no inserts, no deletes). Scoped to one
`userId`.

## Backfill (`scripts/backfill-user-games.ts`)

For every user:
- If the user has **≥ 1** `userGames` row → **skip** (userGames wins; never
  overwrite).
- Else if `users.gamesPlayed` is non-empty → insert its names into `userGames`
  (deduped by `normalizeGame`, `rank`/`hoursPlayed` null).
- Else → nothing to do.

Idempotent: after a run, seeded users now have `userGames` rows, so a re-run skips
them. Safe on local and prod. Reports counts (seeded / skipped-curated / empty).

## Invariants

1. Games selected at onboarding land in `userGames` and appear on profile +
   matching (FR-001/FR-002/SC-001).
2. No game appears twice from onboarding or backfill (dedup by normalized name)
   (FR-003/FR-007/SC-002).
3. The backfill changes only players with zero `userGames` rows; curated players
   are byte-for-byte unchanged (FR-006/SC-003).
4. The backfill is idempotent (SC-004).
5. After this feature, nothing reads or writes `users.gamesPlayed` (FR-008/SC-005).
6. No DB constraint is added; the change tolerates pre-existing duplicate
   `userGames` rows (FR-009/SC-006).
