# Implementation Plan: Admin-editable Suggested Games

**Branch**: `031-admin-suggested-games` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-admin-suggested-games/spec.md`

## Summary

Move the onboarding suggestion list out of a hardcoded const inside a client component and into the
existing `settings` singleton, edited from the Lists tab in Admin → Settings (the tab feature 030
creates — research.md #2). Unlike its apparent twin 030, there is no validation to rework: a new
user's games are already free text and were never checked against this list (research.md #3), so this
is a source swap plus a chip editor. The one rule that matters is that the list must never become a
constraint — doing so would quietly build the game catalog ADR 0001 rejects.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router — no change from the constitution's
Technology Constraints.

**Primary Dependencies**: None new.

**Storage**: One additive column, `settings.suggestedGames text[] NOT NULL DEFAULT {…fourteen current
games}`. No change to `users.gamesPlayed` (already `text[]`, free-form), and no change to `userGames`.

**Testing**: Vitest for the save action's validation (FR-009/FR-010), admin-only gate (FR-011), and
audit entry (FR-012). Playwright e2e for the real promise: an admin adds a game → a brand-new account
sees it at the games step (SC-001), and removing a game leaves an existing player's games untouched
(SC-003). e2e already has an established account-creation path to reuse.

**Target Platform**: Web (existing Next.js app on Vercel).

**Project Type**: Single Next.js web application (existing repo).

**Performance Goals**: SC-002 ("within seconds") — met by the existing 5-second settings TTL cache
(research.md #6). No new work.

**Constraints**: FR-006/FR-007 — no player's games may be modified, and the list must never restrict
what a player can have. This feature writes to exactly one table (`settings`) and never to `users` or
`userGames`.

**Scale/Scope**: One column, one section added to an existing tab, one const moved out of a client
component, one prop threaded from an already-async server page. No new page, route, nav entry, or
action if 030's save action already exists.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan. No ADR: nothing
  ratified changes. **ADR 0001 (games are free-text keywords, no curated catalog) is load-bearing
  here and is preserved, not amended** — research.md #3 records why an editable suggestion list is not
  a catalog, and FR-007 keeps the line bright.
- **II. Validated Trust Boundaries**: The admin's submitted array is Zod-validated at the action
  (non-empty, no blanks, case-insensitively unique). The onboarding boundary is deliberately
  **unchanged** — `gamesPlayedSchema` keeps accepting any non-blank string. Tightening it to the
  suggestion list would look like "better validation" and would in fact be a product change that
  contradicts ADR 0001 and FR-007. Not doing it is the decision.
- **III. Designed, Accessible Experience**: The new section reuses the Lists tab's chip editor, so it
  inherits the visual language. Remove buttons need accessible names that say *which* game they remove
  — fourteen identical "Remove" buttons is the failure mode. The games step itself is unchanged
  visually; only its contents come from elsewhere.
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md. The live temptation is the
  `users.gamesPlayed`-vs-`userGames` split (research.md #8) — a real defect, explicitly **not** this
  feature's job. Do not touch it; log it to `docs/future-work.md` if it isn't there already.
- **V. Test Discipline**: Vitest for the action against a real database; e2e for the
  admin-edit → new-account round trip, which is the only thing that proves the promise. Tests touching
  `settings` MUST restore every field in `afterAll`/`finally` — it is a shared singleton row and
  cross-file corruption through it is an observed risk in this project, not hypothetical.
- **VI. Legible History**: Atomic `feat:` commit(s); `CHANGELOG.md`, `status.md`, and
  `docs/feature-list.md` updated (entry 31).

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/031-admin-suggested-games/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

No `contracts/` — Server Actions are this project's established internal-RPC pattern.

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias).

```text
src/
├── db/schema.ts                              # MODIFIED -- settings.suggestedGames text[] NOT NULL DEFAULT
├── lib/validations/
│   ├── onboarding.ts                         # MODIFIED -- DEFAULT_SUGGESTED_GAMES lives here (seed only);
│   │                                         #             gamesPlayedSchema deliberately UNCHANGED
│   └── admin-settings.ts                     # MODIFIED -- suggestedGames joins the Lists tab's schema
├── lib/settings/get-settings.ts              # MODIFIED -- read + validate the new field
├── lib/actions/save-lists-settings.ts        # MODIFIED (or NEW if 030 hasn't landed) -- carries both arrays
├── components/admin/settings-lists.tsx       # MODIFIED (or NEW if 030 hasn't landed) -- add a second section
├── components/auth/onboarding-wizard.tsx     # MODIFIED -- SUGGESTED_GAMES const removed; list arrives as a prop
└── app/(auth)/onboarding/page.tsx            # MODIFIED -- read the list, pass it to the wizard
```

**Structure Decision**: No new page, route, project, table, or nav entry. The wizard receives the list
as a prop from its already-`async` server parent rather than importing it — a client component
importing a runtime value from a module reaching `@/db` crashes the page, a mistake this project has
already made and fixed once (research.md #5).

**Sequencing with 030** (research.md #2): 030 creates the Lists tab and `save-lists-settings.ts`; this
feature adds a second section and a second array to them. **030 merges first, then this branch takes
`main` before its tab work lands.** This branch was cut from `main` before 030 merged, so without that
step both features independently create the tab and the second merge conflicts. If 030 is dropped,
this feature inherits creating the tab; they are otherwise independent.

## Complexity Tracking

Not required — no constitution violations.
