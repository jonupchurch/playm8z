# Implementation Plan: Admin Users Drawer — View Full Profile in a New Tab

**Branch**: `027-admin-user-profile-link` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-admin-user-profile-link/spec.md`

## Summary

Add a single control to the existing Admin Users drawer (feature 016) that opens the currently-viewed user's real Public Profile page (feature 022, `/u/[handle]`) in a new tab, using the `handle` the drawer already has. No new data, route, page, or server action — a plain `target="_blank"` anchor built from data already in hand, plus e2e coverage that (for the first time) actually exercises the drawer through a real seeded moderator session instead of the stale access-denial-only workaround the original 016 tests were forced into before Admin Settings (024) shipped the real `role` column.

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js App Router — matches the constitution's Technology Constraints, no new choice being made here.

**Primary Dependencies**: None new. Reuses `getUserDetail()`'s existing `handle` field (`src/lib/admin/get-user-detail.ts`) and the existing `/u/[handle]` route (`src/app/u/[handle]/page.tsx`).

**Storage**: N/A — no schema change, no new query.

**Testing**: Playwright e2e, extending `e2e/admin-users.spec.ts` with a real seeded `moderator`-role session (see research.md #3). No new unit test: there is no non-trivial business logic here (`/u/${handle}` string construction is covered by the e2e attribute assertions), and `get-user-detail.ts`'s `handle` field is already unit-tested.

**Target Platform**: Web (existing Next.js app on Vercel).

**Project Type**: Single Next.js web application (existing repo, no new project).

**Performance Goals**: N/A — a static link render, no measurable performance dimension.

**Constraints**: Must not alter the admin queue's URL state (filters/search/`userId`) when the link is clicked — the anchor navigates a *new* tab/context, the current tab's `searchParams`-driven state (`src/app/admin/users/page.tsx`) is untouched by construction, not by extra guard logic.

**Scale/Scope**: One UI control in one existing client component (`src/components/admin/user-drawer.tsx`); no other files change except its e2e spec and the feature tracking docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture**: Satisfied by this spec/plan pair. No ADR needed — there's no non-trivial tradeoff here (no new dependency, data model, auth provider, or storage choice); it's a link built from already-modeled data to an already-shipped route. `docs/feature-list.md` gets a new entry (027) per the project's existing per-feature tracking convention; no ADR.
- **II. Validated Trust Boundaries**: No new trust boundary is crossed — no new form, query param, or server action. The one real consideration is link-safety hygiene: `target="_blank"` MUST carry `rel="noopener noreferrer"` (research.md #2) so the new tab has no `window.opener` handle back to the authenticated admin page. This is a deliberate, called-out mitigation, not a gap.
- **III. Designed, Accessible Experience**: The control MUST reuse the drawer's existing visual language (rounded-xl / border-border / text-text token classes already used by its Ban/Unban and Remove buttons) rather than introducing a new style. It MUST have a clear accessible name (e.g. "View full profile") and be reachable/operable by keyboard exactly like a normal link (native anchor semantics, no custom click-only widget) — the correct native-element choice specifically to satisfy this principle with zero extra work.
- **IV. Scope Discipline (NON-NEGOTIABLE)**: Frozen to spec.md's boundaries: one link, one user at a time, no bulk/multi-select, no master-detail layout change. Any adjacent idea (e.g. actually adopting the new wireframe's layout) goes to `docs/future-work.md`, not into this build.
- **V. Test Discipline**: e2e coverage is mandatory and is the right layer here (this is a rendering + navigation-attributes concern, not business logic). Per research.md #3, this also retires the stale "drawer content can't be exercised end-to-end" comment at the top of `e2e/admin-users.spec.ts` — that limitation no longer exists post-024.
- **VI. Legible History**: One atomic `feat:` commit; `CHANGELOG.md`/`status.md` updated; `docs/feature-list.md` gets entry 27 describing this as a small enhancement to already-shipped feature 016.

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/027-admin-user-profile-link/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

No `data-model.md` and no `contracts/` — there are no new entities and no new interface contract (no new API route, Server Action, or schema). This is documented here rather than as empty placeholder files.

### Source Code (repository root)

Single existing Next.js project (`src/` layout, `@/*` alias) — no new project, app, or package.

```text
src/
├── components/admin/
│   └── user-drawer.tsx        # Add the "View full profile" control (near the header/Ban-Unban button)
├── lib/admin/
│   └── get-user-detail.ts     # Unchanged — already returns `handle`
└── app/u/[handle]/
    └── page.tsx               # Unchanged — existing Public Profile destination

e2e/
└── admin-users.spec.ts        # Extend with a real seeded-moderator describe block; retire the stale
                                # "can't be exercised end-to-end" comment (research.md #3)
```

**Structure Decision**: No new files, directories, routes, or projects. The entire change lives inside the existing `user-drawer.tsx` client component plus its existing e2e spec — consistent with this being a small enhancement to an already-shipped feature (016) rather than a new page.
