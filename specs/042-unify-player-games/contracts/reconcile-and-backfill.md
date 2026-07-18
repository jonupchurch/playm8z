# Contracts: onboarding reconcile + backfill

## `src/lib/games/sync-onboarding-games.ts` (server-only)

```ts
// Reconciles ONE user's userGames rows to exactly `names` (a set), deduped by
// normalizeGame. Inserts newly-selected names, deletes de-selected rows. Never
// writes users.gamesPlayed. Scoped to userId — never touches other users' rows.
export async function syncOnboardingGames(userId: string, names: string[]): Promise<void>
```

Contract:
- `syncOnboardingGames(u, ["Valorant","CS2"])` on an empty user → 2 `userGames`
  rows (`rank`/`hoursPlayed` null).
- Calling again with `["Valorant"]` → the `CS2` row is deleted, `Valorant` remains.
- `["Valorant","valorant"," Valorant "]` → one row (deduped by `normalizeGame`).
- Same selection twice → no inserts, no deletes (idempotent).
- Only `userId`'s rows are ever read/written.

## `src/app/api/onboarding/route.ts` (edit)

- After Zod validation, if `patch.gamesPlayed` is present:
  - `await syncOnboardingGames(userId, patch.gamesPlayed)`.
  - `delete patch.gamesPlayed` so `db.update(users).set(patch)` never writes the
    column (and an otherwise-empty patch skips the update).
- The response's `gamesPlayed` field is derived from the user's current
  `userGames` names (truthful response) rather than the column. The wizard's
  completion summary is client-state-driven and needs no change.

## `src/app/(auth)/onboarding/page.tsx` (edit)

- Prefill the wizard's `gamesPlayed` from the user's `userGames` names (mapped to a
  string array), not `users.gamesPlayed`.

## `scripts/backfill-user-games.ts` (new, idempotent)

```
For each user:
  if (count(userGames where userId) > 0) skip            # userGames wins
  else if (users.gamesPlayed non-empty)
    insert deduped(normalizeGame) names -> userGames (rank/hours null)
Report: seeded, skipped-curated, empty. Safe to re-run; run local then prod.
```

Contract:
- A player with `gamesPlayed=["A","B"]` and no `userGames` → 2 rows after run.
- A player with any `userGames` rows → unchanged (even if `gamesPlayed` differs).
- Re-run → 0 further changes.

## Deprecation sweep

- `src/db/schema.ts`: `users.gamesPlayed` comment updated to "deprecated / retired
  (042): no readers or writers; kept in place, drop deferred to a later cleanup".
- Confirm no remaining product read/write of `users.gamesPlayed` (only the field
  definition and `gamesPlayedSchema` input shape remain).
