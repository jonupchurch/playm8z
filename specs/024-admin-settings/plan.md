# Implementation Plan: Admin Settings

**Branch**: `024-admin-settings` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-admin-settings/spec.md`

## Summary

The `/admin/settings` page, gated at admin (not just moderator):
General (incl. `002`'s long-anticipated real maintenance-mode
toggle), Moderation & auto-flag (real config for `017`/`018`'s
shared auto-flag helper, plus a computed auto-hide-after-N-reports
rule and a display-only ban-review severity badge), Roles & access
(a new 4-tier role model, existing-user role assignment), Feature
flags (one real — Open signups — the rest stored/inert), and Safety
(Discoverable-profiles-by-default, wired to account creation). Fixes
a real gap in Public Profile (`022`), which never honored `007`'s
existing per-user privacy toggles. Extends `002`'s existing singleton
`settings` table exactly as that feature's own spec anticipated.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `002`'s singleton
`settings` table with every new field this feature introduces;
extends `user.role`'s allowed values.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; the
computed auto-hide rule adds a report-count check to Home's/Browse's/
Forum index's already-filtered queries — bounded per-row cost, no new
scaling concern.

**Constraints**: Zod validation (Principle II) for every settings-
save Server Action's input. `require-role.ts` gates this route at
`admin` specifically (stricter than every other admin page's
moderator minimum) — the strictest gate in the project so far. Every
settings-save Server Action re-verifies admin-level session
server-side. WCAG 2.1 AA (Principle III): the section nav and every
toggle/segmented control are real, keyboard-operable, labeled
controls, not color-only.

**Scale/Scope**: 1 extended singleton table (`settings`, ~15 new
fields), 1 extended enum (`user.role`), 1 gated route (admin-only),
~5 Server Actions (one per section, incl. `toggle-maintenance-mode.ts`,
`save-moderation-settings.ts`, `assign-team-role.ts`,
`save-feature-flags.ts`, `save-safety-settings.ts`), bounded
amendments to `auto-flag-rules.ts` (`017`/`018`), Home/Browse/Forum-
index's queries (`003`/`004`/`009`, a second amendment each),
Auth & Onboarding's sign-up path (`001`, twice — open-signups gate and
discoverable-default), and Public Profile's sidebar (`022`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — extending `002`'s singleton settings table (not a new one) and computing auto-hide rather than storing it are both direct applications of already-established precedent and explicit prior anticipation. |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route at `admin`; every settings-save Server Action re-verifies admin-level role server-side, never trusting the page to have hidden controls from a lower-role viewer. |
| III. Designed, Accessible Experience | PASS, with action: the section nav is a real, keyboard-navigable tablist; every toggle/segmented control has an accessible label reflecting state; axe-core scan in e2e. |
| IV. Scope Discipline | PASS, explicitly and repeatedly: three wireframe controls dropped against ADR 0002/hardcoded requirements/inapplicable concepts; `support`/`viewer` roles ship with no differentiated permissions yet; five of six feature flags ship stored-but-inert; "Invite a team member" doesn't build a parallel invite-token system — all reasoned and logged rather than silently over- or under-built. |
| V. Test Discipline | PASS, with action: unit tests for the auto-hide computed-visibility rule and the auto-flag-rules.ts settings-driven behavior; integration tests for maintenance-mode toggling, role assignment (incl. the by-email lookup and its not-found case), open-signups rejection, discoverable-default at account creation, and the Public Profile amendment; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/024-admin-settings/
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
│       └── settings/
│           └── page.tsx                # new — require-role.ts gate
│                                       # at 'admin'; section-nav shell
├── components/
│   └── admin/
│       ├── settings-general.tsx        # new
│       ├── settings-moderation.tsx     # new
│       ├── settings-roles.tsx          # new
│       ├── settings-features.tsx       # new
│       └── settings-safety.tsx         # new
├── db/
│   └── schema.ts                       # extended: `settings` (002)
│                                       # gains ~15 fields; `user.role`
│                                       # allows `support`/`viewer`
└── lib/
    ├── actions/
    │   ├── toggle-maintenance-mode.ts   # new — Server Action
    │   ├── save-general-settings.ts     # new — Server Action
    │   ├── save-moderation-settings.ts  # new — Server Action
    │   ├── assign-team-role.ts          # new — Server Action (incl.
    │   │                                # by-email lookup)
    │   ├── remove-team-member.ts        # new — Server Action
    │   ├── save-feature-flags.ts        # new — Server Action
    │   └── save-safety-settings.ts      # new — Server Action
    ├── validations/
    │   └── admin-settings.ts             # new — Zod schemas
    └── admin/
        ├── get-settings.ts               # extended (002) — reads
        │                               # every new field too
        └── get-team.ts                   # new — team list (role ≥
                                        # support)

# Small, bounded amendments:
# src/lib/moderation/auto-flag-rules.ts (017/018) — reads
# settings.bannedPhrases and the three filter-toggle booleans instead
# of hardcoded constants
# src/lib/postings/get-open-postings.ts (003),
# src/lib/postings/search-postings.ts (004),
# src/lib/forum/search-threads.ts (009) — SECOND amendment each,
# additionally excluding a row whose open-report count meets the
# configured auto-hide threshold (when enabled)
# src/lib/admin/get-posting-queue.ts (017), get-forum-queue.ts (018),
# get-reports-queue.ts (019) — add the "needs ban review" display
# badge when computed severity meets the configured threshold
# src/lib/actions/create-account.ts or equivalent (001) — rejects new
# sign-ups when `openSignups` is false; initializes a new user's
# `discoverable` (007) from `discoverableByDefault`
# src/components/profile/profile-in-common.tsx or the sidebar
# component (022) — honors `showRegion`/`showAgeGroup` (007)

tests/ (colocated, per existing convention)
├── src/lib/validations/admin-settings.test.ts       # new
├── src/lib/admin/get-settings.test.ts               # extended (002)
├── src/lib/admin/get-team.test.ts                   # new
├── src/lib/actions/toggle-maintenance-mode.test.ts  # new
├── src/lib/actions/assign-team-role.test.ts         # new
├── src/lib/actions/save-feature-flags.test.ts       # new
├── src/lib/moderation/auto-flag-rules.test.ts       # extended (017/018)
├── src/lib/postings/get-open-postings.test.ts       # extended (003)
├── src/lib/postings/search-postings.test.ts         # extended (004)
├── src/lib/forum/search-threads.test.ts             # extended (009)
├── src/lib/actions/create-account.test.ts           # extended (001)
e2e/
└── admin-settings.spec.ts                # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`) is imported directly and extended
in place (its role hierarchy grows, its call sites don't change).

## Complexity Tracking

*No violations — table intentionally empty.*
