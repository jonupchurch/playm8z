# Implementation Plan: Admin Content Pages

**Branch**: `021-admin-content-pages` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-admin-content-pages/spec.md`

## Summary

The `/admin/content-pages` management list: stats, a searchable/
filterable table of every `ContentPage`, and row actions that mostly
delegate to `014`'s already-existing mechanisms (`toggle-page-status.ts`
for Publish/Unpublish and, as a plain draft-set, for Delete; its own
inline-edit UI for "Edit"). Adds `ContentPage.system` (new column)
and seeds the three system pages. This feature's only genuinely new
Server Action is page creation ("+ New page").

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `contentPages`
(`014`) with `system`; seeds three rows for the system pages.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; a small,
bounded admin list (fetch-all-then-filter, same as Admin News' own
precedent, not Browse's paginated pattern) — the number of static
pages a site has is inherently small.

**Constraints**: Zod validation (Principle II) for the create/delete
Server Actions' input. `require-role.ts` gates the entire route
server-side (moderator minimum — the wireframe's "editor" label is
not a real distinct role, same normalization as Admin News). Every
Server Action re-verifies the acting session's role server-side.
WCAG 2.1 AA (Principle III): the inline delete-confirm pattern ("Delete?
Yes/No") needs real focus management, following the established
pattern (Admin Users' own inline-confirm precedent).

**Scale/Scope**: 1 new field on `contentPages` (`system`), a 3-row
data seed, 1 gated route, 2 new Server Actions (`create-content-page.ts`,
`delete-content-page.ts` — a thin draft-set wrapper), and reuse (not
reimplementation) of `014`'s existing `toggle-page-status.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — reusing `014`'s `toggle-page-status.ts` and collapsing Delete into the same status field is a direct application of already-established precedent (Admin News' Delete-as-Unpublish; "reuse an existing action rather than reimplement," used throughout the admin moderation cluster). |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; `create-content-page.ts` and `delete-content-page.ts` re-check role server-side. |
| III. Designed, Accessible Experience | PASS, with action: the inline delete-confirm needs real focus management (not just a visual swap), matching Admin Users' established pattern; filter chips and status badges are real, labeled controls, not color-only; axe-core scan in e2e. |
| IV. Scope Discipline | PASS. This feature explicitly builds no second content-editing UI (Edit navigates to `014`'s own inline-edit surface) and no new status value beyond `014`'s existing `published`/`draft`. |
| V. Test Discipline | PASS, with action: unit tests for the search/filter query and the unique-slug-generation logic; integration tests for page creation, the delete-as-draft action, and the role-gate rejection on both; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/021-admin-content-pages/
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
│       └── content-pages/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # stats + searchable/
│                                       # filterable table
├── components/
│   └── admin/
│       └── content-page-table.tsx      # new — stats, search/filter,
│                                       # rows incl. inline
│                                       # delete-confirm
├── db/
│   └── schema.ts                       # extended: `contentPages`
│                                       # (014) gains `system`
└── lib/
    ├── actions/
    │   ├── create-content-page.ts      # new — Server Action
    │   └── delete-content-page.ts      # new — Server Action (thin
    │                                   # draft-set wrapper; reuses
    │                                   # `014`'s `toggle-page-status.ts`
    │                                   # for Publish/Unpublish instead
    │                                   # of a new action)
    ├── validations/
    │   └── admin-content-pages.ts       # new — Zod schemas
    └── admin/
        └── search-content-pages.ts      # new — search/filter query

# Seed data (Foundational phase):
# a migration/seed script inserting the three system pages (About Us,
# Privacy Policy, Terms of Use) with `system = true`, `status =
# published`, minimal placeholder content

tests/ (colocated, per existing convention)
├── src/lib/validations/admin-content-pages.test.ts  # new
├── src/lib/admin/search-content-pages.test.ts       # new
├── src/lib/actions/create-content-page.test.ts      # new
├── src/lib/actions/delete-content-page.test.ts      # new
e2e/
└── admin-content-pages.spec.ts           # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`) and `toggle-page-status.ts` (`014`)
are imported directly, not reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
