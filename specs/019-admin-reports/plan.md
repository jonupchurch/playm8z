# Implementation Plan: Admin Reports

**Branch**: `019-admin-reports` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-admin-reports/spec.md`

## Summary

The `/admin/reports` unified triage queue: stats, a queue grouped by
reported target across four target types (postings, forum, profiles,
messages), and a review drawer with Dismiss/Remove/Warn/Ban. For
postings and forum targets, Remove/Warn delegate entirely to `017`'s
and `018`'s existing resolution actions (reused, not reimplemented).
For profiles and messages — two target types with no prior dedicated
queue — this feature is the first real mover, adding a new
`messages.removedAt` and further generalizing the shared `warnings`
table. Retroactively adds `reports.resolvedAt` to `017`'s/`018`'s
resolve actions and corrects the shared `reason-severity.ts`'s
`impersonation` mapping (medium → high).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — adds `reports.resolvedAt`
(retroactive, `017`/`018`); adds `messages.removedAt` (`011`);
further generalizes `017`'s/`018`'s `warnings` table.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
paginated/filtered query pattern, plus a cross-table aggregate for
"total reports" (research.md #3).

**Constraints**: Zod validation (Principle II) for every Server
Action's input. `require-role.ts` gates the entire route
server-side. Every resolution Server Action re-verifies the acting
session's role server-side. Remove/Warn for posting/forum targets
call `017`'s/`018`'s existing Server Actions directly rather than
duplicating their logic. WCAG 2.1 AA (Principle III): the drawer is
a real dialog/panel with focus trap and Escape-to-close, matching the
established modal pattern.

**Scale/Scope**: 1 new field on `messages` (`removedAt`), 1 gated
route, 1 shared classification helper extracted from `018`
(`classify-forum-target.ts`), 4 Server Actions
(dismiss/remove/warn — each branching by target type — and a thin
ban wrapper), small bounded amendments to `011`'s conversation-view
query, and three small bounded retroactive amendments to `017`'s and
`018`'s already-merged files (`resolvedAt`, x2) plus one to the
shared `reason-severity.ts` helper.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed. Delegating to `017`'s/`018`'s existing actions (rather than reimplementing), generalizing `warnings` further, and correcting the shared severity helper are direct applications of already-established precedent. |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; every Server Action (dismiss/remove/warn/ban, including the delegated calls into `017`/`018`) re-checks role server-side at each layer it passes through. |
| III. Designed, Accessible Experience | PASS, with action: the review drawer is a real dialog (focus trap, `aria-labelledby`, Escape-to-close); target-type badges and severity are not color-only (text labels accompany every badge); axe-core scan in e2e. |
| IV. Scope Discipline | PASS. "Remove content" is explicitly not offered for profile reports rather than inventing a profile-content-moderation system; the cross-link to each module's own queue is a plain navigational link, not a data dependency; no new report-reason categories invented. |
| V. Test Discipline | PASS, with action: unit tests for the grouping/severity/target-classification logic and the cross-source "total reports" aggregate; integration tests for each Server Action (dismiss generic path; remove/warn delegation into `017`/`018`; the new message-removal and profile-warn/ban paths; role-gate rejection) and for the three retroactive amendments; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/019-admin-reports/
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
│       └── reports/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # stats + filterable, grouped
│                                       # queue
├── components/
│   └── admin/
│       ├── reports-queue.tsx           # new — stats cards, filter
│       │                               # chips, grouped queue cards
│       └── report-review-drawer.tsx    # new — dialog/panel,
│                                       # representative reporter,
│                                       # cross-link, owner card,
│                                       # Dismiss/Remove/Warn/Ban
├── db/
│   └── schema.ts                       # extended: `reports` gains
│                                       # `resolvedAt` (retroactive);
│                                       # `messages` gains `removedAt`
└── lib/
    ├── moderation/
    │   └── classify-forum-target.ts    # new — SHARED, extracted from
    │                                   # `018`'s inline classification
    ├── actions/
    │   ├── dismiss-report.ts           # new — Server Action: generic,
    │   │                               # any target type
    │   ├── resolve-report-action.ts    # new — Server Action:
    │   │                               # Remove/Warn, branches by
    │   │                               # target type (delegates into
    │   │                               # `017`/`018` for posting/forum;
    │   │                               # handles message/profile
    │   │                               # directly)
    │   └── ban-reported-user.ts        # new — thin wrapper calling
    │                                   # `016`'s `toggle-user-ban.ts`,
    │                                   # then removing content if any
    ├── validations/
    │   └── admin-reports.ts             # new — Zod schemas
    └── admin/
        ├── get-reports-queue.ts         # new — grouped queue query,
        │                               # incl. computed severity
        └── get-report-review.ts         # new — drawer data (content,
                                        # representative reporter,
                                        # owner card w/ cross-source
                                        # total-reports aggregate)

# Small, bounded amendments:
# src/app/inbox/[conversationId]/page.tsx (011-inbox-messaging) — add
# `AND removedAt IS NULL` to its inline messages query
# src/lib/admin/get-forum-queue.ts (018-admin-forum) — extract its
# inline thread-vs-reply classification into the shared
# classify-forum-target.ts, then import it

# Small, bounded RETROACTIVE amendments:
# src/lib/actions/resolve-posting-report.ts (017) and
# src/lib/actions/resolve-forum-report.ts (018) — set
# `reports.resolvedAt = now()` alongside their existing
# `status = 'resolved'` write
# src/lib/moderation/reason-severity.ts (018) — correct
# `impersonation` from medium to high severity

tests/ (colocated, per existing convention)
├── src/lib/moderation/classify-forum-target.test.ts # new
├── src/lib/validations/admin-reports.test.ts        # new
├── src/lib/admin/get-reports-queue.test.ts          # new
├── src/lib/admin/get-report-review.test.ts          # new
├── src/lib/actions/dismiss-report.test.ts           # new
├── src/lib/actions/resolve-report-action.test.ts    # new
├── src/lib/actions/ban-reported-user.test.ts        # new
├── src/lib/actions/resolve-posting-report.test.ts   # extended (017)
├── src/lib/actions/resolve-forum-report.test.ts     # extended (018)
├── src/lib/moderation/reason-severity.test.ts       # extended (018)
e2e/
└── admin-reports.spec.ts                # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`), `toggle-user-ban.ts` (`016`),
`resolve-posting-report.ts` (`017`), and `resolve-forum-report.ts`
(`018`) are imported directly, not reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
