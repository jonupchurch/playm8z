# Implementation Plan: Admin Forum

**Branch**: `018-admin-forum` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-admin-forum/spec.md`

## Summary

The `/admin/forum` moderation queue: stats (including an
audit-log-derived "actioned today"), a queue spanning threads and
replies (filterable All/Threads/Replies/Auto-flagged), and a review
drawer with in-context flagged content, Approve/Remove/Lock/Warn/Ban
resolution actions. Extends `forumThreads` with `autoFlagReason`,
`moderationReviewedAt`, `lockedAt`; extends `forumReplies` with
`autoFlagReason`, `moderationReviewedAt`, and a new `removedAt`.
Extracts two shared moderation helpers (`reason-severity.ts`,
`auto-flag-rules.ts`) out of Admin Postings (`017`) and generalizes
its `warnings` table to a polymorphic `targetType`/`targetId` shape —
all three as small, bounded retroactive amendments to `017`'s
already-merged files.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — extends `forumThreads` and
`forumReplies` with new fields; generalizes `017`'s `warnings` table;
transitions `reports.status` (`008`); writes/reads `auditEntries`
(`015`).

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; standard
paginated/filtered query pattern (Admin Postings', `017`, precedent).

**Constraints**: Zod validation (Principle II) for every Server
Action's input. `require-role.ts` gates the entire route
server-side. Every resolution Server Action re-verifies the acting
session's role server-side. Ban author calls Admin Users' existing
`toggle-user-ban.ts` directly. WCAG 2.1 AA (Principle III): the
drawer is a real dialog/panel with focus trap and Escape-to-close,
matching the established modal pattern.

**Scale/Scope**: 3 new fields on `forumThreads`, 3 new fields on
`forumReplies`, 1 gated route, 1 shared moderation-helpers module (2
functions), 4 Server Actions (approve/remove/lock/warn — ban
delegates to `016`'s existing action), small bounded amendments to
`009`'s and `010`'s existing Server Actions/queries, and three small
bounded retroactive amendments to `017`'s already-merged files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed. Extracting shared helpers and generalizing `warnings` are direct applications of already-established precedent (computed-severity pattern; "generalize when a real third consumer appears," explicitly anticipated by `017`'s own research.md). |
| II. Validated Trust Boundaries | PASS, with action: `require-role.ts` gates the route; every Server Action (approve/remove/lock/warn, plus the reused ban action) re-checks role server-side; `post-reply.ts`'s lock-check happens server-side, not just a hidden UI control. |
| III. Designed, Accessible Experience | PASS, with action: the review drawer is a real dialog (focus trap, `aria-labelledby`, Escape-to-close); the dimmed preceding-context block remains readable (not opacity-only to the point of failing contrast); axe-core scan in e2e. |
| IV. Scope Discipline | PASS. The shared auto-flag ruleset stays the same small fixed set introduced by `017` (no new categories invented for forum content); locking only blocks new replies, nothing more. |
| V. Test Discipline | PASS, with action: unit tests for the shared `reason-severity.ts`/`auto-flag-rules.ts` helpers, the report-target classification (thread vs. reply), and queue-membership logic; integration tests for each Server Action (including role-gate rejection, the lock-then-reply-rejected effect, the audit-log write/read) and for each of the three `017` amendments; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/018-admin-forum/
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
│       └── forum/
│           └── page.tsx                # new — require-role.ts gate,
│                                       # stats + filterable queue
├── components/
│   └── admin/
│       ├── forum-queue.tsx             # new — stats cards, filter
│       │                               # chips, queue cards (type
│       │                               # badge, reason chips, banner)
│       └── forum-review-drawer.tsx     # new — dialog/panel,
│                                       # in-context flagged content,
│                                       # author card, resolution
│                                       # actions incl. Lock
├── db/
│   └── schema.ts                       # extended: `forumThreads`
│                                       # gains `autoFlagReason`,
│                                       # `moderationReviewedAt`,
│                                       # `lockedAt`; `forumReplies`
│                                       # gains the same trio (incl.
│                                       # a NEW `removedAt`); `017`'s
│                                       # `warnings` table generalized
└── lib/
    ├── moderation/
    │   ├── reason-severity.ts          # new — SHARED, extracted from
    │   │                               # `017`'s inline copy (and
    │   │                               # corrected to the canonical
    │   │                               # `reports.reason` taxonomy)
    │   └── auto-flag-rules.ts          # new — SHARED, extracted from
    │                                   # `017`'s inline copy
    ├── actions/
    │   ├── resolve-forum-report.ts     # new — Server Action:
    │   │                               # Approve/Remove/Lock/Warn
    │   └── ban-forum-author.ts         # new — thin wrapper calling
    │                                   # `016`'s `toggle-user-ban.ts`
    │                                   # then removing the thread/reply
    ├── validations/
    │   └── admin-forum.ts               # new — Zod schemas
    └── admin/
        ├── get-forum-queue.ts           # new — queue query, incl.
        │                               # report-target classification
        └── get-forum-review.ts          # new — drawer data (content,
                                        # preceding-context, reports,
                                        # author card)

# Small, bounded amendments (research.md #2-#3):
# src/lib/actions/create-thread.ts (009-forum-index) and
# src/lib/actions/post-reply.ts (010-forum-thread) — apply the shared
# auto-flag-rules.ts ruleset at creation time
# src/lib/actions/post-reply.ts (010-forum-thread) — also reject
# replying to a locked thread
# src/lib/admin/get-thread.ts (010-forum-thread) — add
# `AND removedAt IS NULL` for replies

# Small, bounded RETROACTIVE amendments to 017-admin-postings:
# src/lib/admin/get-posting-queue.ts — import the shared
# reason-severity.ts instead of its own inline copy
# src/lib/actions/create-posting.ts — import the shared
# auto-flag-rules.ts instead of its own inline copy
# src/lib/actions/resolve-posting-report.ts — write the generalized
# `warnings.targetType`/`targetId` shape instead of `postingId`

tests/ (colocated, per existing convention)
├── src/lib/moderation/reason-severity.test.ts       # new
├── src/lib/moderation/auto-flag-rules.test.ts       # new
├── src/lib/validations/admin-forum.test.ts          # new
├── src/lib/admin/get-forum-queue.test.ts            # new
├── src/lib/actions/resolve-forum-report.test.ts     # new
├── src/lib/actions/ban-forum-author.test.ts         # new
├── src/lib/actions/create-thread.test.ts            # extended (009)
├── src/lib/actions/post-reply.test.ts                # extended (010)
├── src/lib/admin/get-posting-queue.test.ts          # extended (017)
├── src/lib/actions/create-posting.test.ts           # extended (017)
├── src/lib/actions/resolve-posting-report.test.ts   # extended (017)
e2e/
└── admin-forum.spec.ts                  # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-role.ts` (`002`) and `toggle-user-ban.ts` (`016`) are
imported directly, not reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
