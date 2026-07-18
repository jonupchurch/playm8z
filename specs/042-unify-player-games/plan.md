# Implementation Plan: One home for a player's games

**Branch**: `042-unify-player-games` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/042-unify-player-games/spec.md`

## Summary

Make `userGames` the single source of truth for a player's games. Onboarding's
game step, instead of writing `users.gamesPlayed`, reconciles the player's
`userGames` to the selected set (add/remove, deduped by `normalizeGame`); the
onboarding prefill reads `userGames`. A one-time idempotent backfill seeds
`userGames` from `users.gamesPlayed` ONLY for players with zero `userGames` rows
(userGames-wins, never clobber/resurrect). `users.gamesPlayed` is deprecated —
no remaining readers/writers — but kept in place (no destructive drop). No new
column, no DB constraint; dedup stays application-side as it already is for the
Steam import. ADR 0015 records the source-of-truth decision.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned).
**Primary Dependencies**: Drizzle ORM + postgres.js. No new dependencies.
**Storage**: PostgreSQL. NO schema change — `users.gamesPlayed` stays (deprecated),
`userGames` unchanged. Dedup by `normalizeGame` (`name.trim().toLowerCase()`),
matching `steam-import.ts`'s existing pattern; `userGames` has no unique
constraint and none is added.
**Testing**: Vitest (integration for the reconcile helper + onboarding route; unit
where pure) + existing Playwright. `fileParallelism:false`.
**Project Type**: Web application (single Next.js app, `src/` layout, `@/*`).
**Constraints**: The onboarding reconcile is a set-sync scoped to one user; it
must never touch another user's rows and must be safe to re-submit. The backfill
must only ever seed empty-`userGames` users (never overwrite) and be idempotent.
**Scale/Scope**: 1 reconcile helper, edits to the onboarding route + onboarding
page prefill, a deprecation sweep of `users.gamesPlayed`, 1 idempotent backfill
script (local + prod), 1 ADR. No migration.

## Constitution Check

*GATE: pass before Phase 0; re-check after Phase 1.*

- **I. Spec-Driven & Legible Architecture** — PASS. spec/plan/tasks committed;
  ADR 0015 records `userGames` as the single source of truth, the seed-empty-only
  backfill rule, and deprecate-not-drop.
- **II. Validated Trust Boundaries** — PASS. The onboarding route already
  validates its body with `onboardingPatchSchema` (Zod); games arrive as
  validated names and are reconciled server-side against the session user only.
  No new external input surface.
- **III. Designed, Accessible Experience** — PASS. No UI change — the wizard's
  game picker and suggestions are untouched; only the server persistence target
  and the prefill source change.
- **IV. Scope Discipline** — PASS. No column drop, no DB constraint, no other
  store reconciled — all logged to future-work.
- **V. Test Discipline** — PASS. The reconcile helper (add/remove/dedup), the
  onboarding route (games land in `userGames`, `gamesPlayed` no longer written),
  and the backfill (seed-empty-only, idempotent, curated-untouched) are tested.
- **VI. Legible History** — PASS. Conventional Commits; CHANGELOG/status/future-work;
  ADR committed with the code. Player-facing bug fix ⇒ a **Patch Notes** post to
  prod (per the standing workflow) is warranted for US1.

**No violations. Complexity Tracking not required.**

## Project Structure

```text
specs/042-unify-player-games/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/reconcile-and-backfill.md
└── tasks.md            # /speckit-tasks

src/
├── db/schema.ts                       # EDIT: mark users.gamesPlayed deprecated (comment only)
├── lib/games/
│   ├── sync-onboarding-games.ts       # NEW: reconcile userGames to a name set (dedup)
│   └── sync-onboarding-games.test.ts  # NEW
├── app/api/onboarding/route.ts        # EDIT: reconcile userGames from patch.gamesPlayed; stop writing the column
├── app/api/onboarding/route.test.ts   # NEW/EDIT (if present)
└── app/(auth)/onboarding/page.tsx     # EDIT: prefill games from userGames
docs/adr/0015-usergames-single-source-of-truth.md   # NEW
scripts/backfill-user-games.ts         # NEW: seed userGames from gamesPlayed for empty-userGames users
```

**Structure Decision**: The reconcile logic lives in a small server-only helper
`sync-onboarding-games.ts` (imports `db`), so the onboarding route stays thin and
the set-sync + dedup is unit/integration-testable on its own. The backfill reuses
`normalizeGame` and the same dedup, in a standalone idempotent script.

## Phase 0 — Research

See [research.md](./research.md): userGames-wins + seed-empty-only (the
disagreement rule), the set-sync reconcile (safe because onboarding is linear),
dedup-by-normalizeGame with no DB constraint, why the completion summary needs no
server change (client-state driven), and deprecate-not-drop.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the two stores, the reconcile, the backfill
  rule, and the deprecation.
- [contracts/reconcile-and-backfill.md](./contracts/reconcile-and-backfill.md) —
  `syncOnboardingGames()` and the backfill contract.
- [quickstart.md](./quickstart.md) — manual validation.
- ADR [0015](../../docs/adr/0015-usergames-single-source-of-truth.md).

## Post-Design Constitution Re-Check

Still PASS on all six. No migration, no new trust boundary, no UI change; the two
correctness guarantees (reconcile scoped to one user; backfill seeds empty-only,
idempotent) are covered by Principle V tests and ADR 0015.
