# Implementation Plan: Error Pages

**Branch**: `002-error-pages` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-error-pages/spec.md`

## Summary

Four branded full-page states — not-found, server-error, access-denied
(split 401/403 on the wire, one shared look), and maintenance — replacing
framework defaults and blank screens. Technical approach: build one
shared visual component from the wireframe, wire it into Next.js 16's
native App Router file conventions (`not-found.tsx`, `error.tsx` +
`global-error.tsx`, `forbidden.tsx` + `unauthorized.tsx`), add a tiny
`settings` table for the maintenance flag (read-only for this feature —
Admin Settings owns writing to it later), and short-circuit maintenance
mode in `proxy.ts` (Next 16's renamed middleware) ahead of every
non-admin route.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router) only — no new npm
packages. Per AGENTS.md's instruction to check `node_modules/next/dist/
docs/` before assuming API shape (this Next.js version has real breaking
changes from training-data assumptions), the following were confirmed
directly from the installed docs rather than assumed:
- `app/not-found.tsx` already handles all unmatched URLs app-wide (since
  v13.3.0) — no need for the experimental `global-not-found.js`/
  `globalNotFound` flag.
- `app/error.tsx` (Client Component error boundary, wraps each route
  segment) plus `app/global-error.tsx` (catches root-layout failures
  `error.tsx` can't) together cover every unhandled-error case. Next.js
  auto-generates `error.digest` per error — usable directly as the
  spec's reference code (FR-004), no custom ID generator needed. The new
  (v16.2.0) `unstable_retry()` prop re-fetches/re-renders the failed
  boundary — a better "try again" than a full page reload.
- `app/forbidden.tsx` + `app/unauthorized.tsx`, driven by the
  `forbidden()`/`unauthorized()` functions (`next/navigation`), are the
  native mechanism for 403/401 respectively — this is *why* spec.md's
  FR-008 was corrected to split 401 (not logged in) from 403 (wrong
  role) instead of forcing 403 for both: it's what Next.js already does
  natively, for free. Both files render the same shared visual
  component, satisfying the spec's "one visual look" requirement (FR-013)
  without forcing one HTTP status for two different conditions. These
  require enabling `experimental.authInterrupts` in `next.config.ts` and
  cannot be called from the root layout (not a constraint here — every
  gated check happens in a page/route handler, never the root layout).
- Proxy (`proxy.ts`, Next 16's renamed `middleware.ts`) is the documented
  place for lightweight, cookie/config-level checks that must run on
  every route — used here for the maintenance short-circuit. Next's own
  guidance is to keep proxy checks fast and avoid heavy per-request
  database work, which shapes the maintenance-flag read (see research.md
  #2).

**Storage**: PostgreSQL via Drizzle ORM — one new minimal `settings`
singleton table (`maintenanceMode`, `maintenanceMessage`), read-only for
this feature (data-model.md). Same local Postgres / Neon split as every
other feature.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core accessibility scans) — both already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No specific latency Success Criteria in spec.md.
The maintenance-flag read runs on every request via `proxy.ts` (per
Next's own guidance to keep proxy checks fast), so it's cached rather
than hitting Postgres per-request (research.md #2).

**Constraints**: WCAG 2.1 AA (Principle III) on all four states —
axe-core scan required, this is the first feature to build the shared
error-state component the wireframe/`guidelines.md` §12.5 describes.
No new user-submitted trust boundary (Principle II) — this feature has
no forms; the maintenance flag is admin-authored config (not
attacker-controlled input) but is still read through a typed accessor
rather than assumed to match shape.

**Scale/Scope**: 4 shared visual states, 1 new tiny settings table, a
proxy-level maintenance check, and a reusable `requireRole()` helper
for future gated pages (e.g., the not-yet-built `/admin/*` pages) to
call — same "ready but unconsumed" pattern as Auth & Onboarding's
write-gate helper.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the Next.js-mechanism choices and the interim settings-table approach are implementation-scoped, captured in research.md, not cross-cutting product/architecture calls like ADRs 0001-0005. |
| II. Validated Trust Boundaries | PASS. No new user-submitted input in this feature. Auth/role checks happen server-side via `forbidden()`/`unauthorized()`, never a client-side conditional. |
| III. Designed, Accessible Experience | PASS, with action: first feature to build the shared error-state component from the wireframe; axe-core scans required across all four states. |
| IV. Scope Discipline | PASS. Admin Settings' maintenance-toggle UI and full settings storage are explicitly out of scope — only the minimal flag this feature reads is added, logged as an interim/read-only slice the future Admin Settings feature will extend. |
| V. Test Discipline | PASS, with action: unit tests for the settings-read helper and the role-gate helper; integration test confirming the settings table round-trips through Drizzle; e2e coverage (with axe scans) for all four states plus the maintenance short-circuit. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-error-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — this feature adds no fetch-based API surface (it's
page-level rendering plus a proxy check), so the contracts step is
skipped per the plan template's "skip if purely internal" guidance.

### Source Code (repository root)

```text
src/
├── app/
│   ├── not-found.tsx                  # new — 404 state
│   ├── error.tsx                      # new — 500 state (segment boundary)
│   ├── global-error.tsx               # new — 500 state (root-layout boundary)
│   ├── forbidden.tsx                  # new — 403 state (shared component)
│   └── unauthorized.tsx               # new — 401 state (shared component)
├── components/
│   └── errors/
│       └── error-state.tsx            # new — the one shared visual component
│                                       # (logo, motif, code, title, message,
│                                       # two actions, footnote) driving all
│                                       # four states, per the wireframe
├── db/
│   └── schema.ts                      # extended: new `settings` singleton
│                                       # table (data-model.md)
├── lib/
│   ├── settings/
│   │   └── get-settings.ts            # new — cached read of the settings
│   │                                   # row (maintenanceMode, message)
│   └── auth/
│       └── require-role.ts            # new — reusable role/auth gate
│                                       # calling forbidden()/unauthorized(),
│                                       # ready for future gated pages
└── proxy.ts                            # new — maintenance short-circuit,
                                        # every route except /admin/*
next.config.ts                          # modified — experimental.authInterrupts
tests/ (colocated, per existing convention)
├── src/lib/settings/get-settings.test.ts   # new
├── src/lib/auth/require-role.test.ts       # new
e2e/
├── error-pages.spec.ts                 # new — 404/500/403/401 states + axe
└── maintenance.spec.ts                 # new — maintenance short-circuit
```

**Structure Decision**: single Next.js project, no frontend/backend
split — matches the existing repo layout. All work is additive (new
special-file conventions, one new small table, a proxy check); nothing
existing is reorganized.

## Complexity Tracking

*No violations — table intentionally empty.*
