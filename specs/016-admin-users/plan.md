# Implementation Plan: Admin Users

**Branch**: `016-admin-users` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-admin-users/spec.md`

## Summary

The `/admin/users` main content: a searchable/filterable user table
with computed "flagged" status, Ban/Unban, and a detail drawer with
per-item content removal. Extends `user` with `bannedAt` and
`postings`/`forumThreads` with `removedAt`. Includes small, bounded
amendments to Home's/Browse's/Forum index's existing read queries so
removal actually hides content.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `user` with
`bannedAt`; extends `postings` (`003`) and `forumThreads` (`009`) with
`removedAt` (data-model.md).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
paginated/filtered query pattern (Browse's/Forum index's precedent).

**Constraints**: Zod validation (Principle II) for search/filter
`searchParams` and every Server Action's input. `require-role.ts`
gates the entire route server-side. Ban/unban and content-removal
Server Actions re-verify the acting session's role server-side, never
trusting that the page only showed these controls to an authorized
viewer. WCAG 2.1 AA (Principle III): the inline delete-confirm pattern
("Delete? Yes/No") needs real focus management (not just a visual
swap), and the drawer is a real dialog/panel with focus trap and
Escape-to-close, following the established modal pattern.

**Scale/Scope**: 2 extended tables (`removedAt` on two of them), 1
extended table (`bannedAt` on `user`), 1 gated route, 3 Server Actions
(ban/unban, remove-content), small query amendments in two other
features.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the Ban-only (no Delete) and computed-"flagged" decisions are direct applications of already-established precedent (Profile's Deactivate/Delete, Error Pages' computed-HOT pattern), not new architecture calls. |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; ban/unban and remove-content Server Actions re-check role server-side, never relying on the page having hidden the controls from an unauthorized viewer. |
| III. Designed, Accessible Experience | PASS, with action: accessible inline delete-confirm, a real dialog/panel for the drawer (focus trap, Escape-to-close), axe-core scan. |
| IV. Scope Discipline | PASS. Auto-removing a banned user's content, and how Listing detail/Forum Thread handle a removed target when directly linked, are both explicitly excluded and logged, not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the computed-flagged logic and search/filter query; integration tests for ban/unban and remove-content (including the role-gate rejection and the Home/Browse/Forum-index exclusion effect); e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/016-admin-users/
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
│   └── admin/
│       └── users/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # stats + searchable/filterable
│                                       # table
├── components/
│   └── admin/
│       ├── user-table.tsx              # new — incl. inline delete-
│       │                               # confirm-style Ban toggle
│       └── user-drawer.tsx             # new — dialog/panel, Postings/
│                                       # Forum-posts tabs, Remove
├── db/
│   └── schema.ts                       # extended: `user` gains
│                                       # `bannedAt`; `postings` (003)
│                                       # and `forumThreads` (009) gain
│                                       # `removedAt` (data-model.md)
└── lib/
    ├── actions/
    │   ├── toggle-user-ban.ts          # new — Server Action
    │   └── remove-user-content.ts      # new — Server Action (posting
    │                                   # or forum thread, by type)
    ├── validations/
    │   └── admin-users.ts               # new — Zod schemas
    └── admin/
        ├── search-admin-users.ts        # new — search/filter query,
        │                               # incl. computed "flagged"
        └── get-user-detail.ts           # new — drawer data (postings,
                                        # forum threads, report count)

# Small, bounded amendments (research.md #2):
# src/lib/postings/get-open-postings.ts (003-home) and
# src/lib/postings/search-postings.ts (004-browse) — add
# `removedAt IS NULL` to their existing WHERE clauses
# src/lib/forum/search-threads.ts (009-forum-index) — same,
# for `forumThreads.removedAt`

tests/ (colocated, per existing convention)
├── src/lib/validations/admin-users.test.ts          # new
├── src/lib/admin/search-admin-users.test.ts         # new
├── src/lib/actions/toggle-user-ban.test.ts          # new
├── src/lib/actions/remove-user-content.test.ts      # new
e2e/
└── admin-users.spec.ts                  # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002-error-pages`) is imported directly.

## Complexity Tracking

*No violations — table intentionally empty.*
