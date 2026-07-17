# Implementation Plan: Messages in the top nav with an unread badge

**Branch**: `037-inbox-nav-badge` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/037-inbox-nav-badge/spec.md`

## Summary

Surface the already-built Inbox (feature 011) as a first-class top-nav entry with an unread-message badge, mirroring the existing notification bell. The only new logic is a read helper, `getUnreadMessageCount(userId)`, that returns the number of unread direct/group messages for the viewer, computed with a fixed, small number of queries (not one-per-conversation). The nav gets a new `MessagesLink` entry (a plain link + badge, no dropdown), the redundant Inbox link is removed from the account dropdown, and `SiteHeader` fetches the count alongside its existing notifications fetch. No schema changes, no new tables, no messaging behavior changes.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned version; consult `node_modules/next/dist/docs/` before touching framework APIs)

**Primary Dependencies**: Drizzle ORM + postgres.js (existing `conversations`/`messages` tables), Auth.js v5 (session already resolved in `SiteHeader`), Tailwind CSS

**Storage**: PostgreSQL via Drizzle. Reuses `conversations` (`memberIds`, `lastReadAt` JSONB cursor, `createdAt`) and `messages` (`senderId`, `createdAt`). No new columns, no migration.

**Testing**: Vitest (integration test for the count helper against a real DB, mirroring `get-inbox-list.test.ts`; component render test for the nav entry) + Playwright (e2e: badge visible with unread, gone when zero, one-click to inbox, a11y name)

**Target Platform**: Web (server-rendered nav on every authenticated page)

**Project Type**: Web application (single `src/` project)

**Performance Goals**: The count runs in `SiteHeader` on every authenticated page render. It MUST be a fixed number of queries (2) regardless of how many conversations the viewer has — no per-conversation fan-out.

**Constraints**: The nav badge count MUST equal the inbox page's per-conversation unread total for the same viewer at the same moment (SC-002). This is achieved by reusing the *exact* unread predicate and threshold derivation that `get-inbox-list.ts` already uses.

**Scale/Scope**: One new read helper (~25 lines), one new nav component (~20 lines), two edits (`site-header.tsx`, `profile-menu.tsx`). Small.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development & Legible Architecture** — PASS. Spec/plan/tasks are being produced in order. **No ADR required**: this feature introduces no new data model, auth, storage, or third-party integration and makes no architectural tradeoff. The one scoping decision (badge counts messages-only, not party requests/invites) is a UX-scope call recorded in spec FR-003 with its rationale, not an architecture decision. CHANGELOG.md/status.md will be updated (Principle VI).
- **II. Validated Trust Boundaries** — PASS. `getUnreadMessageCount` takes a `userId` that `SiteHeader` has already resolved **server-side** from the Auth.js session against the DB — no client-reported identity, no form/query input crosses into this feature. There is no new trust boundary, so no new Zod schema is needed (and adding one would be validating a value that never came from a client).
- **III. Designed, Accessible Experience** — PASS. The badge matches the notification bell's design language (same box, same badge style, same `99+` cap) and its accessibility treatment: an `aria-label` that conveys the count (FR-008) and a visible badge that does not rely on color alone. An axe assertion is included in the e2e scope.
- **IV. Scope Discipline** — PASS. Bounded to a nav entry point + one count helper + removing a redundant link. Explicitly out of scope: a preview dropdown, real-time updates, any messaging capability, any change to the bell or the inbox page. No scope creep.
- **V. Test Discipline** — PASS. The count helper (business logic hitting Postgres) gets an integration test that asserts parity with the inbox's unread semantics and the messages-only rule. The nav entry and the dropdown-link removal get component/e2e coverage. CI (typecheck + lint + Vitest + Playwright) must be green before merge.
- **VI. Legible History** — PASS. Conventional-commit `feat(037): …`, atomic commits mapped to tasks, CHANGELOG.md + status.md updated in the same feature.

**No violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/037-inbox-nav-badge/
├── plan.md              # This file
├── spec.md              # Feature spec (/speckit-specify output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── unread-count.md  # Read-helper signature + nav a11y contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing)
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
src/
├── lib/inbox/
│   ├── get-unread-message-count.ts        # NEW: single-purpose read helper (2 queries)
│   ├── get-unread-message-count.test.ts   # NEW: integration test (real DB)
│   └── get-inbox-list.ts                   # UNCHANGED: the parity reference for unread semantics
├── components/nav/
│   ├── messages-link.tsx                   # NEW: link + badge (no dropdown; server component)
│   ├── site-header.tsx                     # EDIT: fetch count, render MessagesLink beside the bell
│   ├── notification-bell.tsx               # UNCHANGED: badge style/cap reference only
│   └── profile-menu.tsx                    # EDIT: remove the now-redundant Inbox link
```

**Structure Decision**: Standard single-project `src/` web layout, already in use. The count helper lives beside its sibling reads in `src/lib/inbox/`; the nav entry lives beside the bell and profile menu in `src/components/nav/`. No new top-level directories.

## Complexity Tracking

Not applicable — no constitution violations to justify.
