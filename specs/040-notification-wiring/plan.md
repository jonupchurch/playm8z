# Implementation Plan: Notification Wiring — real events light up the bell

**Branch**: `040-notification-wiring` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/040-notification-wiring/spec.md`

## Summary

Retrofit four already-shipped write actions so they finally call the existing
`createNotification()` mechanism (built by feature 012 and never wired to a real
caller). A forum reply notifies the thread's author (`reply`); an `@mention` in a
forum thread or reply notifies each mentioned player (`mention`); accepting or
declining an applicant-initiated join request notifies the applicant
(`accepted` / new `declined` type). All notification writes are strictly
best-effort — a failure logs and is swallowed, never rolling back or failing the
primary action. Recipients are filtered through the existing
`hasActiveBlockBetween()` guard and self-exclusion. The host's already-working
live view of inbound requests (synthesized from `applications`, not from stored
notifications) is left untouched, which is what prevents duplication.

The only genuinely new code is a pure `@mention` parser, a small best-effort
"notify" module, and a `declined` notification type threaded through the two
display mappings. No schema migration is required — `notifications.type` is a
free-text column, so `declined` is additive at the type level only.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js App Router (repo-pinned
version — consult `node_modules/next/dist/docs/` before touching framework APIs)

**Primary Dependencies**: Drizzle ORM + postgres.js; Auth.js v5 (only indirectly,
via the actions' existing `requireVerifiedEmail()`); no new dependencies

**Storage**: PostgreSQL via Drizzle. Writes to the existing `notifications` table
only. No new table, no new column, no migration.

**Testing**: Vitest (unit for the pure mention parser; integration for each
retrofitted action, real DB, mocking only `@/auth`) + existing Playwright e2e.
`fileParallelism:false` / workers:1 as project-wide.

**Target Platform**: Vercel (Node.js runtime); local dev on local Postgres.

**Project Type**: Web application (single Next.js app, `src/` layout, `@/*` alias).

**Performance Goals**: Notification emission adds a bounded handful of queries to
each already-non-hot write action (one recipient lookup + one block-check per
recipient; mentions are typically 0–3). No hot-render-path Steam-style concern.

**Constraints**: Notification creation MUST NOT extend or endanger
`accept-request.ts`'s existing transaction (seat accounting) — it runs strictly
after the transaction commits. Untrusted forum text is parsed for mentions but a
handle string is never trusted as a user (resolved server-side; unknown handles
ignored).

**Scale/Scope**: 4 write actions wired, 1 new pure parser, 1 new notify module,
2 display-mapping edits, 1 type-union edit. Three user stories (P1/P2/P3),
independently testable.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. Spec-Driven & Legible Architecture** — PASS. spec.md → this plan →
  tasks.md will be committed. A plan-phase ADR (0013) records the wiring
  decision, the best-effort seam, the `declined` type, and the
  host-synthesized/applicant-persisted split.
- **II. Validated Trust Boundaries** — PASS, and directly exercised. `@mention`
  tokens are attacker-controlled free text: they are parsed with a strict handle
  grammar and resolved against real `users.handle` rows; a token that matches no
  user is silently ignored. No client-reported identity is trusted — every actor
  is the server-side authenticated user the action already established. No new
  external input surface, so no new Zod schema is required (the actions' existing
  input validation is unchanged); the mention grammar itself is the validation.
- **III. Designed, Accessible Experience** — PASS. Reuses the existing
  notifications list/row components; the only visual addition is a `declined`
  icon/color in the established `TYPE_ICON` map and its `categoryOf` filter
  bucket, matching the existing `accepted` treatment. No new page/state.
- **IV. Scope Discipline** — PASS. Scope is frozen to the three chosen events.
  Deferred siblings (notify-all-participants, DM-in-bell, news/system broadcast)
  are logged to `docs/future-work.md`, not built.
- **V. Test Discipline** — PASS. New pure logic (mention parser) gets unit tests;
  each retrofitted action gets integration coverage asserting the notification is
  written to the right recipient, self/blocked/unknown are skipped, dedupe holds,
  and — critically — the primary action still succeeds when the notification
  write fails.
- **VI. Legible History** — PASS. Conventional Commits, one logical change each;
  CHANGELOG.md + status.md updated; ADR 0013 committed with the code.

**No violations. Complexity Tracking table not required.**

## Project Structure

### Documentation (this feature)

```text
specs/040-notification-wiring/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── data-model.md        # Phase 1 — the records produced + declined type
├── quickstart.md        # Phase 1 — manual validation walkthrough
├── contracts/
│   └── notify-events.md  # Phase 1 — the notify module + parser contracts
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── notifications/
│   │   ├── create-notification.ts      # EDIT: add "declined" to NotificationType
│   │   ├── filter-notifications.ts     # EDIT: categoryOf → "declined" = requests
│   │   ├── parse-mentions.ts           # NEW: pure extractMentionHandles(text)
│   │   ├── parse-mentions.test.ts      # NEW: unit tests for the grammar
│   │   ├── notify-events.ts            # NEW: best-effort emitters (server-only)
│   │   └── notify-events.test.ts       # NEW: integration tests for the emitters
│   └── actions/
│       ├── post-reply.ts               # EDIT: notify author + mentions
│       ├── create-thread.ts            # EDIT: notify mentions
│       ├── accept-request.ts           # EDIT: notify applicant (post-tx)
│       └── decline-request.ts          # EDIT: notify applicant
├── components/
│   └── notifications/
│       └── notifications-list.tsx      # EDIT: TYPE_ICON["declined"]
docs/
└── adr/
    └── 0013-notification-wiring-best-effort.md   # NEW
```

**Structure Decision**: Single Next.js app, existing layout. The new logic lands
in `src/lib/notifications/` alongside the mechanism it finally exercises. Emitters
are grouped in one `notify-events.ts` (server-only, imports `db`) so the four
actions each add a single call; the pure parser is a separate file so client
bundles and unit tests never pull `db`.

## Phase 0 — Research

See [research.md](./research.md). Key decisions: the `@mention` grammar (bound to
the real handle format, with an email/word-boundary guard), the reply-vs-mention
dedupe via recipient exclusion, the applicant-only firing of accept/decline (the
host-initiated-invite reversal is covered by live synthesis, not re-notified),
the actor/text/targetRef shape that reads correctly under the row's forced
`@{actor}` prefix, and the best-effort try/catch seam (outside the transaction
for accept).

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the four notification records produced,
  the `declined` type addition, and the transient mention token.
- [contracts/notify-events.md](./contracts/notify-events.md) — signatures for
  `extractMentionHandles`, the emitters, and their self/unknown/block/dedupe
  contracts.
- [quickstart.md](./quickstart.md) — manual validation of each user story.
- ADR [0013](../../docs/adr/0013-notification-wiring-best-effort.md).

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1: still PASS on all six. The design adds no new trust
boundary beyond the mention parser (covered by II), no schema migration, and no
new page. The best-effort seam is the one subtle correctness point and is
called out explicitly in II/V and ADR 0013.
