# Implementation Plan: Profile + Account settings

**Branch**: `007-profile-and-account-settings` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-profile-and-account-settings/spec.md`

## Summary

The signed-in user's own account, at four real routes under `/profile`
(Overview, My postings, Saved, Account) sharing one layout, rather than
the wireframe's single-page client-side tab state — giving each tab a
shareable URL, more idiomatic for App Router. Introduces `userGames`
and `savedListings` (this feature's own, though Listing detail is a
second consumer of the latter), extends `user` with `bio`, `createdAt`,
four privacy booleans, and `deactivatedAt`. Reuses Post a Game's Server
Action pattern throughout, and Auth & Onboarding's verification-email
helper for the email-change flow.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod`, `bcrypt-ts` (already installed, for password change) — no new
runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `user` with `bio`,
`createdAt`, `privacyShowAge`, `privacyShowRegion`, `privacyShowOnline`,
`privacyDiscoverable`, `deactivatedAt`; two new tables, `userGames` and
`savedListings` (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria beyond
SC-001/SC-003's "immediately" framing, satisfied structurally by Server
Actions plus Next.js's normal re-render, the same pattern already used
throughout this project.

**Constraints**: Zod validation (Principle II) for every Server
Action. Reactivation-on-login (research.md #3) touches `src/auth.ts`
directly — the second feature to modify shared auth config, after
Auth & Onboarding's own Google `profile()` callback — so this needs
care not to regress anything Auth & Onboarding already established.
WCAG 2.1 AA (Principle III): four real tab routes need correct
`aria-current`/landmark semantics (not just visual active-state
styling), and the Danger Zone's Deactivate action needs a confirmation
step given its impact (hiding the account) even though it's reversible.

**Scale/Scope**: 4 routes sharing one layout, two new tables, ~7
Server Actions, extends `user` with 7 columns total.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed. The Deactivate/Delete collapse was a real product decision, made via the user directly (not silently assumed), and is recorded in spec.md rather than needing a separate ADR — it's a UI-scope decision, not a cross-cutting architectural one. |
| II. Validated Trust Boundaries | PASS, with action: every Server Action (profile edit, password change, email change, game add/remove, posting edit/close/reopen, privacy toggle, deactivate) validates its input with Zod; password change re-verifies the current password server-side before accepting a new one. |
| III. Designed, Accessible Experience | PASS, with action: real tab routes with correct landmark/`aria-current` semantics, a confirmation step on Deactivate, axe-core scan. |
| IV. Scope Discipline | PASS. Rating/sessions/groups/level, pronouns/languages/timezone, and Connected Accounts are explicitly omitted and logged, not silently half-built (see spec.md's Assumptions and `docs/future-work.md`). |
| V. Test Discipline | PASS, with action: unit tests for every new Zod schema; integration tests for each Server Action, including the password-change re-verification, the posting-edit-blocked-after-acceptance rule, and deactivate/reactivate; e2e coverage (with axe) for all four user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/007-profile-and-account-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — every write is a Server Action, consistent with
every feature since Post a Game.

### Source Code (repository root)

```text
src/
├── app/
│   └── profile/
│       ├── layout.tsx                  # new — header (avatar, name,
│       │                               # handle, joined date, Online
│       │                               # badge) + the four tab links
│       ├── page.tsx                    # new — Overview
│       ├── postings/
│       │   └── page.tsx                # new — My postings
│       ├── saved/
│       │   └── page.tsx                # new — Saved
│       └── account/
│           └── page.tsx                # new — Account settings
├── components/
│   └── profile/
│       ├── games-list.tsx              # new — Overview's editable
│       │                               # games-I-play section
│       ├── posting-management-card.tsx # new — My postings' per-
│       │                               # posting Edit/Close/Reopen
│       ├── privacy-toggles.tsx         # new
│       └── danger-zone.tsx             # new — Deactivate, with a
│                                       # confirmation step
├── db/
│   └── schema.ts                       # extended: `user` gains `bio`,
│                                       # `createdAt`, four privacy
│                                       # booleans, `deactivatedAt`;
│                                       # new `userGames`,
│                                       # `savedListings` tables
│                                       # (data-model.md)
├── auth.ts                             # modified — clears
│                                       # `deactivatedAt` on successful
│                                       # sign-in (research.md #3)
└── lib/
    ├── actions/
    │   ├── update-profile.ts           # new — display name, region,
    │   │                               # bio
    │   ├── manage-games.ts             # new — add/remove a UserGame
    │   ├── change-password.ts          # new
    │   ├── update-email.ts             # new — resets emailVerified,
    │   │                               # resends verification (reuses
    │   │                               # Auth & Onboarding's helper)
    │   ├── manage-posting.ts           # new — edit (pre-acceptance
    │   │                               # only)/close/reopen
    │   ├── update-privacy.ts           # new
    │   └── deactivate-account.ts       # new
    └── validations/
        └── profile.ts                   # new — all of this feature's
                                        # Zod schemas
tests/ (colocated, per existing convention)
├── src/lib/validations/profile.test.ts              # new
├── src/lib/actions/update-profile.test.ts           # new
├── src/lib/actions/manage-games.test.ts             # new
├── src/lib/actions/change-password.test.ts          # new
├── src/lib/actions/update-email.test.ts             # new
├── src/lib/actions/manage-posting.test.ts           # new
├── src/lib/actions/update-privacy.test.ts           # new
├── src/lib/actions/deactivate-account.test.ts       # new
e2e/
└── profile.spec.ts                      # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. Four real routes under `/profile` sharing `layout.tsx`, rather
than the wireframe's single-page client-tab-state approach
(research.md #1) — each tab is independently linkable/testable.

## Complexity Tracking

*No violations — table intentionally empty.*
