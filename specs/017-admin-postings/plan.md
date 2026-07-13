# Implementation Plan: Admin Postings

**Branch**: `017-admin-postings` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-admin-postings/spec.md`

## Summary

The `/admin/postings` moderation queue: stats, filterable queue
(computed severity, user-reported vs. auto-flagged), and a review
drawer with Approve/Remove/Warn/Ban resolution actions. Extends
`postings` with `autoFlagReason` and `moderationReviewedAt`;
introduces a new `warnings` table; is the first real writer of
`reports.status = resolved` and the first real caller of
`logAuditEntry()`. Includes small, bounded amendments to Post a
Game's `create-posting.ts` (sets `autoFlagReason`), Admin Users'
`toggle-user-ban.ts`/`remove-user-content.ts` (adds the
`logAuditEntry()` call each was always intended to get), and Admin
Dashboard's `get-dashboard-kpis.ts`/`get-top-games.ts` (excludes
`removedAt`-set postings from "live" counts).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `postings` with
`autoFlagReason` and `moderationReviewedAt`; new `warnings` table;
transitions `reports.status` (`008`); writes `auditEntries` (`015`).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
paginated/filtered query pattern (Browse's/Forum index's/Admin
Users' precedent).

**Constraints**: Zod validation (Principle II) for every Server
Action's input. `require-role.ts` gates the entire route
server-side. Approve/Remove/Warn/Ban Server Actions re-verify the
acting session's role server-side. Ban author calls Admin Users'
existing `toggle-user-ban.ts` directly rather than re-implementing
ban logic. WCAG 2.1 AA (Principle III): the drawer is a real
dialog/panel with focus trap and Escape-to-close, following the
established modal pattern (Blocked Users, Forum Index, Admin Users).

**Scale/Scope**: 2 extended fields on `postings`, 1 new table
(`warnings`), 1 gated route, 4 Server Actions
(approve/remove/warn/ban — ban delegates to `016`'s existing
action), 1 small amendment to `005`'s `create-posting.ts`, small
amendments to two of `016`'s existing Server Actions and two of
`015`'s existing query functions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — computed severity, ban-removes-the-posting, and the single `resolved` status value are direct applications of already-established precedent (computed-status pattern, ADR 0005, "don't invent a value speculatively"). |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; every Server Action (approve/remove/warn, plus the reused ban action) re-checks role server-side. |
| III. Designed, Accessible Experience | PASS, with action: the review drawer is a real dialog (focus trap, `aria-labelledby`, Escape-to-close), filter chips are real buttons with visible focus/active state, axe-core scan in e2e. |
| IV. Scope Discipline | PASS. The auto-flag ruleset is explicitly scoped to a small fixed keyword/account-age check (not a general filter/ML system); warning-triggered author notification is explicitly deferred to `docs/future-work.md`; a separate `dismissed` report status is explicitly not introduced speculatively. |
| V. Test Discipline | PASS, with action: unit tests for computed severity and queue-membership logic, the auto-flag ruleset, and the Zod schemas; integration tests for each Server Action (including the role-gate rejection, the report-resolution side effect, the audit-log write, and the two retroactive amendments' new behavior); e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/017-admin-postings/
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
│       └── postings/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # stats + filterable queue
├── components/
│   └── admin/
│       ├── posting-queue.tsx           # new — stats cards, filter
│       │                               # chips, queue cards
│       └── posting-review-drawer.tsx   # new — dialog/panel, "why
│                                       # it's here", author card,
│                                       # Approve/Remove/Warn/Ban
├── db/
│   └── schema.ts                       # extended: `postings` gains
│                                       # `autoFlagReason` and
│                                       # `moderationReviewedAt`; new
│                                       # `warnings` table
└── lib/
    ├── actions/
    │   ├── resolve-posting-report.ts    # new — Server Action:
    │   │                               # Approve/Remove/Warn (shared
    │   │                               # resolution + audit-log path)
    │   └── ban-posting-author.ts        # new — thin wrapper calling
    │                                   # `016`'s `toggle-user-ban.ts`
    │                                   # then removing the posting
    ├── validations/
    │   └── admin-postings.ts            # new — Zod schemas
    └── admin/
        ├── get-posting-queue.ts         # new — queue query, incl.
        │                               # computed severity/filter
        └── get-posting-review.ts        # new — drawer data (posting,
                                        # reports, author card)

# Small, bounded amendments (research.md #2-#4):
# src/lib/actions/create-posting.ts (005-post-game) — sets
# `autoFlagReason` at insert time per the fixed ruleset
# src/lib/actions/toggle-user-ban.ts and
# src/lib/actions/remove-user-content.ts (016-admin-users) — add the
# logAuditEntry() call each was always intended to get
# src/lib/admin/get-dashboard-kpis.ts and
# src/lib/admin/get-top-games.ts (015-admin-dashboard) — add
# `AND removedAt IS NULL` to their `status = 'open'` filters

tests/ (colocated, per existing convention)
├── src/lib/validations/admin-postings.test.ts       # new
├── src/lib/admin/get-posting-queue.test.ts          # new
├── src/lib/actions/resolve-posting-report.test.ts   # new
├── src/lib/actions/ban-posting-author.test.ts       # new
├── src/lib/actions/create-posting.test.ts           # extended (005)
├── src/lib/actions/toggle-user-ban.test.ts          # extended (016)
├── src/lib/actions/remove-user-content.test.ts      # extended (016)
e2e/
└── admin-postings.spec.ts               # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002-error-pages`) and `toggle-user-ban.ts`
(`016-admin-users`) are imported directly, not reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
