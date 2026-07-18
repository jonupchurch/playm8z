# Implementation Plan: Lock down `userGames` as the true single source of truth

**Branch**: `043-usergames-lockdown` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/043-usergames-lockdown/spec.md`

## Summary

Complete feature 042's two deferred follow-ups (ADR 0015 §4 and §5): make a duplicate
game per player impossible at the database level, and drop the retired `users.gamesPlayed`
column. Approach: (1) a per-player **expression unique index** on `(userId, lower(btrim(game)))`
that exactly matches the existing `normalizeGame` (trim + lowercase); (2) a one-time, idempotent
`dedupeUserGames()` that collapses any pre-existing duplicate rows (keeping the most-detailed row)
so the index can be created; (3) make `addUserGame` conflict-safe (app-side dedup + non-throwing
insert) so the constraint never surfaces as a raw error and duplicates are refused with a benign
"already in your list"; (4) drop `users.gamesPlayed` from schema + database and retire 042's now-
defunct backfill code that read it. Production DDL is applied by hand before merge (per 041/042) so
the deploy's `drizzle-kit push` is a no-op. ADR 0016 records the decision and supersedes ADR 0015 §4/§5.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned), Node 24 on Vercel

**Primary Dependencies**: Drizzle ORM + `drizzle-kit` (schema at `src/db/schema.ts`), postgres.js,
Auth.js v5, Zod. No new dependencies.

**Storage**: PostgreSQL — local server for dev; Neon (Vercel Marketplace) for prod/preview. `userGames`
and `users` tables. `vercel-build` = `drizzle-kit push --verbose && next build` (schema auto-pushed on deploy).

**Testing**: Vitest (unit/integration, `fileParallelism:false`), Playwright (e2e). CI on every push must be green.

**Target Platform**: Vercel (prod `https://www.playm8z.net`).

**Project Type**: Web application (single Next.js project, `src/` layout).

**Performance Goals**: N/A — a data-integrity + cleanup change; no hot-path perf impact (the unique index is
tiny and only touched on game writes).

**Constraints**: No new DB uniqueness *by materialized column* (expression index only); `normalizeGame`
semantics unchanged; onboarding client contract unchanged; production DDL by hand before merge so the deploy
push is a no-op; each DDL step verified by querying (a silent `db:migrate`/push no-op must not be trusted).

**Scale/Scope**: Small user base (single-digit/low prod players). Small change surface: 1 schema edit, 1 new
dedupe function + script, 1 action made conflict-safe, removal of defunct backfill code, an ADR.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Spec-Driven & Legible Architecture** — PASS. spec/plan/tasks committed; **ADR 0016** records the
  uniqueness + column-drop decision and supersedes ADR 0015 §4/§5. README unaffected (no new architecture).
- **II. Validated Trust Boundaries** — PASS. `addUserGame` already validates input via `userGameSchema` (Zod);
  no new trust boundary. Auth unchanged (`requireAuth` stays). The dedupe/migration scripts are operator tools,
  not request paths.
- **III. Designed, Accessible Experience** — PASS. No new UI. The only player-perceptible change is that adding
  a game already in the list returns a benign "already in your list" result instead of creating a duplicate —
  a copy string surfaced through the existing games-editor result channel; no new state to design.
- **IV. Scope Discipline (NON-NEGOTIABLE)** — PASS. This is exactly 042's two deferred, ADR-logged follow-ups,
  now unblocked (backfill stable). Bounded to `userGames` + the `gamesPlayed` drop; everything else is Out of Scope
  in the spec. No scope drift.
- **V. Test Discipline** — PASS. New unit tests for `dedupeUserGames()` (winner selection, idempotency) and for
  `addUserGame` conflict-safety (duplicate/case-variant add → one row + benign result); the full suite including
  the onboarding e2e must pass. The e2e that referenced the dropped column was already corrected on main.
- **VI. Legible History** — PASS. Conventional commits, one atomic change each, `CHANGELOG.md`/`status.md` updated;
  a user-facing CHANGELOG line ("no more duplicate games on your profile") triggers a Patch Notes prod post per the
  standing workflow. ADR written alongside the code.

**No violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/043-usergames-lockdown/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── uniqueness-and-migration.md
├── checklists/
│   └── requirements.md  # (from /speckit-specify)
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/db/schema.ts                         # remove users.gamesPlayed; declare userGames expression unique index
src/lib/games/
├── normalize-game.ts                    # unchanged (the trim+lowercase rule the index mirrors)
├── dedupe-user-games.ts                 # NEW: dedupeUserGames() — collapse pre-existing duplicates
├── backfill-user-games.ts              # REMOVE (defunct: reads the dropped column; migration already ran)
└── sync-onboarding-games.ts            # unchanged (already dedups)
src/lib/actions/manage-games.ts          # addUserGame made conflict-safe (app-side dedup + onConflictDoNothing)
scripts/
├── dedupe-user-games.ts                # NEW: thin wrapper to run dedupeUserGames() + report (local + prod)
├── drop-gamesplayed-column.mjs         # NEW (repo-root .mjs at run time): idempotent ALTER DROP + CREATE INDEX + verify
└── backfill-user-games.ts             # REMOVE (defunct wrapper)

Tests:
src/lib/games/dedupe-user-games.test.ts  # NEW
src/lib/games/backfill-user-games.test.ts# REMOVE (function retired)
src/lib/actions/manage-games.test.ts     # ADD/AMEND conflict-safety cases
e2e/signup-onboarding.spec.ts            # already fixed on main (queries userGames)
```

**Structure Decision**: Single Next.js project (`src/` layout), matching the whole codebase. No new modules;
one new pure function + its script and one new one-shot DDL script, mirroring 042's dedupe/backfill/script shape.

## Complexity Tracking

No constitution violations — table intentionally omitted.
