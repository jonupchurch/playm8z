# Quickstart: validating one home for a player's games

## US1 — onboarding games reach the profile + matching

1. Create a brand-new account and go through onboarding; on the games step, pick
   two games (e.g. Valorant, CS2) and finish.
2. Open `/profile` → both games are listed.
3. View another player who shares one of them → "games in common" counts it.
4. Repeat onboarding (fresh account), select a game then deselect it before
   finishing → it is absent from the profile.
5. Pick the same game twice (or `Valorant` and `valorant`) → it appears once.

## US2 — backfill existing players (developer check)

1. Seed a "legacy" player: a user with `users.gamesPlayed = ['Halo','Halo']` and
   NO `userGames` rows. Seed a "curated" player: `userGames = ['Apex']` and
   `gamesPlayed = ['Fortnite']`.
2. Run `npx tsx scripts/backfill-user-games.ts` (local).
3. Legacy player → `userGames = ['Halo']` (deduped); profile + matching now show it.
4. Curated player → `userGames` still exactly `['Apex']` (Fortnite NOT added).
5. Re-run the script → no changes (idempotent). Report shows 0 seeded on the 2nd run.

## US3 — gamesPlayed retired

- Grep the product for reads/writes of `users.gamesPlayed` → only the schema field
  (marked deprecated) and `gamesPlayedSchema` (the wizard input shape) remain; no
  feature reads or writes the column.

## Automated

- `npm test` — `sync-onboarding-games` (add/remove/dedup/scoped), the onboarding
  route (games land in `userGames`, `gamesPlayed` not written), and the backfill
  (seed-empty-only, curated-untouched, idempotent).
- `npm run typecheck` / `npm run lint` green.

## Production

- After merge, run the backfill against prod (prod `DATABASE_URL` pulled to a temp
  path outside the repo, used, deleted) and confirm the report.
