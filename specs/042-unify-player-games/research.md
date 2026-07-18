# Research: One home for a player's games

Decisions resolved before design. Grounded in code read 2026-07-17.

## 1. `userGames` wins; `gamesPlayed` only seeds empty-`userGames` players

**Decision**: The maintained `userGames` table is the single source of truth.
`users.gamesPlayed` is a deprecated onboarding-only snapshot. The backfill seeds
`userGames` from `gamesPlayed` ONLY for players who have zero `userGames` rows.

**Rationale**: This is the answer to the "which store wins if they disagree?"
question the future-work note raised. `userGames` is what the profile, matching
(`get-in-common.ts`), and public profile already read and what the profile editor
maintains — it is the live truth. `gamesPlayed` is written once at onboarding and
never updated. Seeding only empty-`userGames` players means we recover people who
lost their onboarding picks without ever resurrecting a game a curating player
removed or overwriting a curated list. Anyone with any `userGames` row is skipped
entirely.

## 2. Onboarding reconciles `userGames` via a scoped set-sync

**Decision**: When the onboarding PATCH carries `gamesPlayed` (a name array), the
route reconciles that user's `userGames` to exactly that set — insert selected
names not already present, delete `userGames` rows whose normalized name is no
longer selected — and does NOT write `users.gamesPlayed`. Implemented in a helper
`syncOnboardingGames(userId, names)`.

**Rationale**: Onboarding is a linear first-time flow: `userGames` is empty at the
start, and a player who finishes onboarding manages games from their profile, not
by re-entering onboarding. So a set-sync during onboarding cannot clobber a
separately-curated list — it only ever reflects the onboarding selection. Set-sync
(not insert-only) is needed so deselecting a game during the wizard removes it.
The reconcile is scoped to `userId`, so it never touches another player's rows.

## 3. Dedup by `normalizeGame`; no DB constraint added

**Decision**: Deduplicate by `normalizeGame(name)` (= `name.trim().toLowerCase()`,
`@/lib/games/normalize-game`) in application code, both in the reconcile and the
backfill. Do NOT add a unique/normalized constraint to `userGames`.

**Rationale**: `userGames` has no unique constraint and `addUserGame` is a plain
insert; the Steam import already dedups server-side with `normalizeGame`. Matching
that existing pattern keeps things consistent and avoids a migration that could
FAIL on any pre-existing duplicate rows. A constraint is a separate decision with
its own de-dup migration (out of scope, logged to future-work).

## 4. The completion summary needs no server change

**Decision**: Leave the wizard's completion summary as-is.

**Rationale**: `onboarding-wizard.tsx` builds the summary client-side from its own
`profile.gamesPlayed` state (`buildSummary(profile)`), not from the server
response. Since the reconcile writes exactly the selected set, the client state
already equals what's saved, so the summary stays accurate with no change. The
onboarding route will still return a `gamesPlayed` field derived from `userGames`
(so the response is truthful for any other consumer), but the summary doesn't
depend on it.

## 5. Prefill reads `userGames`

**Decision**: `src/app/(auth)/onboarding/page.tsx` prefills the wizard's game
selection from the user's `userGames` names instead of `users.gamesPlayed`.

**Rationale**: For the prefill to reflect reality (including a backfilled player
re-entering onboarding), it must read the source of truth. Names are mapped out of
`userGames` into the same string-array shape the wizard already consumes.

## 6. Deprecate, don't drop

**Decision**: Stop reading/writing `users.gamesPlayed` everywhere; keep the column
with a "deprecated / retired" schema comment. No `DROP COLUMN`.

**Rationale**: Dropping is a destructive migration and a separate decision; keeping
the column costs nothing and preserves the historical snapshot until a later
deliberate cleanup (logged to future-work). `gamesPlayedSchema` stays as the
wizard's input shape, now mapped into `userGames` server-side.

## 7. Testing approach

**Decision**: Integration-test `syncOnboardingGames` (real DB): adds new, removes
deselected, dedups normalized-equal names, scoped to one user. Integration-test
the onboarding route: a games PATCH lands rows in `userGames` and writes nothing to
`users.gamesPlayed`. Integration-test the backfill: seeds an empty-`userGames`
player from `gamesPlayed`, leaves a curated player untouched, idempotent on re-run,
dedups.

**Rationale**: These are real DB seams (Principle V). The backfill's
seed-empty-only + idempotency + never-overwrite guarantees are the load-bearing
safety properties and must be directly asserted, using the established real-DB
integration pattern (mock only `@/auth` where a route needs a session).
