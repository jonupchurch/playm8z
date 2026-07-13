# Implementation Plan: Public Profile

**Branch**: `022-public-profile` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-public-profile/spec.md`

## Summary

The public `/u/:handle` profile: identity/bio/stats, games, open
parties, display-only reviews, and a public-info sidebar (all
public, no auth needed to view). Adds Follow (new, simple, hard-
deletable relation) and a host-initiated "Invite to a party" that
reuses Listing detail's (`006`) `applications` table via a new
`initiatedBy` discriminator, with small, bounded amendments to
Inbox's (`011`) accept/decline ownership check and inbox-list
surfacing so the invited user (not the inviting host) makes the
accept/decline decision. Introduces the read-only `Review` entity
with no writer yet (rating submission stays deferred). Drops six
wireframe elements against already-established decisions (online
presence, reliability %, groups, per-game rank/hours, level,
pronouns/languages/timezone).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `drizzle-orm`,
`zod` — all already installed, no new runtime dependencies.

**Storage**: PostgreSQL via Drizzle ORM — new `follows` and `reviews`
tables; extends `applications` (`006`) with `initiatedBy`.

**Testing**: Vitest (unit/integration) and Playwright (e2e, incl.
axe-core) — already installed and CI-enforced.

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime).

**Project Type**: Web application — single Next.js project.

**Performance Goals**: No explicit latency Success Criteria; per-
profile data (games, open postings, reviews, mutual connections) is
bounded per user, not an unbounded list — no pagination needed.

**Constraints**: Zod validation (Principle II) for Follow/Invite's
Server Action input. `require-verified-email.ts` (Auth & Onboarding,
`001`) gates Follow/Message/Invite/Report/Block, consistent with
every other write action; viewing the page itself requires no auth.
Invite's accept/decline reuses `011`'s existing transactional logic
(seat decrement, posting-fill, conversation creation) — the bounded
amendment only changes WHO is authorized to call it for a host-
initiated row, never the transaction itself. WCAG 2.1 AA (Principle
III): the "..." menu is a real, keyboard-operable disclosure with
focus management, matching the established pattern.

**Scale/Scope**: 2 new tables (`follows`, `reviews`), 1 extended
table (`applications` gains `initiatedBy`), 1 public route
(`/u/:handle`), 3 new Server Actions (`toggle-follow.ts`,
`invite-to-party.ts`, reusing `006`'s apply/message/report/block
actions directly for everything else), and small, bounded amendments
to `011`'s `accept-request.ts`, `decline-request.ts`, and
`get-inbox-list.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. No new ADR needed — the `initiatedBy` generalization of `applications` and the hard-delete treatment of `follows` are direct applications of already-established precedent (extend-when-a-real-need-appears; the `SavedListing`/`Likes` no-history exception). |
| II. Validated Trust Boundaries | PASS, with action: `require-verified-email.ts` gates every write action here; `invite-to-party.ts` and the amended `accept-request.ts`/`decline-request.ts` re-verify server-side that the acting user is actually the authorized party (host for `initiatedBy='applicant'`, invited applicant for `initiatedBy='host'`) rather than trusting the UI to only show controls to the right person. |
| III. Designed, Accessible Experience | PASS, with action: the "..." menu is a real disclosure (focus trap/Escape-to-close, matching the established modal/menu pattern); Follow/Invite controls have accessible labels reflecting current state, not color-only. |
| IV. Scope Discipline | PASS. Six wireframe elements (online presence, reliability %, groups, per-game rank/hours, level, pronouns/languages/timezone) are explicitly dropped with cited precedent, not silently built; `Review`'s writer remains deferred. |
| V. Test Discipline | PASS, with action: unit tests for the sessions/mutual-connections/shared-games computed aggregates; integration tests for Follow/Unfollow, invite creation, the amended accept/decline ownership check (both directions), and the unauthenticated/unverified rejection paths; e2e coverage (with axe) for all three user stories. |
| VI. Legible History | Applies at tasks.md/implementation time. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/022-public-profile/
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
│   └── u/
│       └── [handle]/
│           └── page.tsx                # new — public, no auth gate
│                                       # to view; Server Component
│                                       # assembling all sections
├── components/
│   └── profile/
│       ├── profile-header.tsx          # new — identity, stats,
│       │                               # action buttons, "..." menu
│       ├── profile-games.tsx           # new
│       ├── profile-open-parties.tsx    # new — reuses `006`'s Apply
│       │                               # action via "Request"
│       ├── profile-reviews.tsx         # new — display-only
│       └── profile-in-common.tsx       # new — mutual connections +
│                                       # shared games (auth'd, non-
│                                       # self viewers only)
├── db/
│   └── schema.ts                       # new `follows`, `reviews`
│                                       # tables; extends
│                                       # `applications` (006) with
│                                       # `initiatedBy`
└── lib/
    ├── actions/
    │   ├── toggle-follow.ts            # new — Server Action
    │   └── invite-to-party.ts          # new — Server Action
    ├── validations/
    │   └── public-profile.ts            # new — Zod schemas
    └── profile/
        ├── get-public-profile.ts        # new — identity, stats
        │                               # (incl. computed sessions),
        │                               # games, open postings,
        │                               # reviews
        └── get-in-common.ts             # new — mutual-follow and
                                        # shared-games computation

# Small, bounded amendments (research.md #3):
# src/lib/actions/accept-request.ts and decline-request.ts
# (011-inbox-messaging) — authorized actor branches on
# `applications.initiatedBy`
# src/lib/inbox/get-inbox-list.ts (011-inbox-messaging) — also
# surfaces a pending host-initiated invite in the invited user's own
# inbox

tests/ (colocated, per existing convention)
├── src/lib/validations/public-profile.test.ts       # new
├── src/lib/profile/get-public-profile.test.ts       # new
├── src/lib/profile/get-in-common.test.ts            # new
├── src/lib/actions/toggle-follow.test.ts            # new
├── src/lib/actions/invite-to-party.test.ts          # new
├── src/lib/actions/accept-request.test.ts           # extended (011)
├── src/lib/actions/decline-request.test.ts          # extended (011)
├── src/lib/inbox/get-inbox-list.test.ts             # extended (011)
e2e/
└── public-profile.spec.ts                # new
```

**Structure Decision**: single Next.js project, no frontend/backend
split. `require-verified-email.ts` (`001`) and `011`'s existing
accept/decline actions are imported directly, not reimplemented.

## Complexity Tracking

*No violations — table intentionally empty.*
