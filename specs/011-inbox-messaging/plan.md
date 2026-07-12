# Implementation Plan: Inbox / messaging

**Branch**: `011-inbox-messaging` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-inbox-messaging/spec.md`

## Summary

A two-pane inbox at `/inbox` (list layout + `/inbox/[conversationId]`
for the active chat). Introduces `conversations` and `messages`; reads/
updates `applications` and `postings` (accept/decline); reads `blocks`
(compose-search exclusion). No websocket layer — sending is a Server
Action, and an open conversation refreshes via a short client-side
`router.refresh()` poll.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — two new tables,
`conversations` and `messages` (data-model.md); updates existing
`applications`/`postings` rows as a side effect of accept/decline;
reads existing `blocks` rows.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria. The
client-side poll interval (research.md #2) is a UX tradeoff (freshness
vs. request volume), tuned at implementation time, not fixed here.

**Constraints**: Zod validation (Principle II) for message bodies and
every Server Action's input. Accepting a request touches two rows
(`applications` and `postings`) that must change together — wrapped in
a single database transaction so a failure can't leave one updated
without the other. WCAG 2.1 AA (Principle III): the two-pane layout
needs correct landmark structure (list as navigation, chat as main),
the message list needs an `aria-live="polite"` region so new messages
are announced, and the Accept/Decline banner needs clear, non-color-
only affordances.

**Scale/Scope**: 2 new tables, 2 routes (list layout + conversation
detail), 4 Server Actions (send message, start conversation, accept
request, decline request), a merged list query, a lightweight poll.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. Follows spec.md; no new ADR needed — the lazy-Conversation-creation approach and the no-websocket decision are implementation-scoped (research.md), and deliberately avoid needing to amend Listing detail's already-merged docs. |
| II. Validated Trust Boundaries | PASS, with action: every Server Action's input is Zod-validated; accept/decline re-checks server-side that the acting user is actually the posting's host, never trusting client state; the accept transaction is atomic. |
| III. Designed, Accessible Experience | PASS, with action: proper two-pane landmark structure, `aria-live` for new messages, non-color-only Accept/Decline affordances, axe-core scan. |
| IV. Scope Discipline | PASS. Presence, real-time push, and a separate Notification entity are explicitly excluded and logged (`docs/future-work.md`), not half-built. |
| V. Test Discipline | PASS, with action: unit tests for the merged-list logic and Zod schemas; integration tests for send/start/accept/decline (including the atomic seatsOpen/status update and the block-exclusion enforcement); e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/011-inbox-messaging/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — every write is a Server Action; polling reuses
`router.refresh()` against the existing Server Component route rather
than a new fetch-based endpoint (research.md #2).

### Source Code (repository root)

```text
src/
├── app/
│   └── inbox/
│       ├── layout.tsx                  # new — redirects an
│       │                               # unauthenticated visitor to
│       │                               # /login (FR-001); renders the
│       │                               # conversation list pane
│       ├── page.tsx                    # new — empty/no-selection
│       │                               # state for the chat pane
│       └── [conversationId]/
│           └── page.tsx                # new — active chat pane;
│                                       # a Client Component wrapper
│                                       # polls via router.refresh()
├── components/
│   └── inbox/
│       ├── conversation-list.tsx       # new
│       ├── message-thread.tsx          # new — incl. the
│       │                               # aria-live region
│       ├── request-banner.tsx          # new — Accept/Decline
│       └── compose-modal.tsx           # new — follows the Blocked
│                                       # Users/Forum-index dialog
│                                       # pattern
├── db/
│   └── schema.ts                       # extended: new
│                                       # `conversations`, `messages`
│                                       # tables (data-model.md)
└── lib/
    ├── actions/
    │   ├── send-message.ts             # new — Server Action
    │   ├── start-conversation.ts       # new — Server Action
    │   ├── accept-request.ts           # new — Server Action
    │   │                               # (transactional)
    │   └── decline-request.ts          # new — Server Action
    ├── validations/
    │   └── inbox.ts                     # new — Zod schemas
    └── inbox/
        ├── get-inbox-list.ts            # new — merges real
        │                               # conversations with pending-
        │                               # hosted-request Applications
        └── search-contacts.ts           # new — compose search,
                                        # excluding blocked/blocking
                                        # users (reads `008`'s `blocks`)
tests/ (colocated, per existing convention)
├── src/lib/validations/inbox.test.ts                # new
├── src/lib/inbox/get-inbox-list.test.ts             # new
├── src/lib/actions/send-message.test.ts             # new
├── src/lib/actions/start-conversation.test.ts       # new
├── src/lib/actions/accept-request.test.ts           # new
├── src/lib/actions/decline-request.test.ts          # new
e2e/
└── inbox.spec.ts                        # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `search-contacts.ts` reads the existing `blocks` table
(`008-blocked-users`) directly — no changes to that feature's files.

## Complexity Tracking

*No violations — table intentionally empty.*
