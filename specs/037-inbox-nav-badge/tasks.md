---
description: "Task list for 037 — Messages in the top nav with an unread badge"
---

# Tasks: Messages in the top nav with an unread badge

**Input**: Design documents from `specs/037-inbox-nav-badge/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/unread-count.md, quickstart.md

**Tests**: Included. Per Constitution Principle V (Test Discipline), the count helper (business logic hitting Postgres) and the nav component get tests, and the two P1 stories get e2e coverage.

**Organization**: By user story. Both stories are P1 and ship together; they are split for traceability and independent testability — US1 is the entry point's *presence*, US2 is the badge's *accuracy*.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 (Setup, Foundational, Polish carry no story label)

## Path Conventions

Single-project `src/` web app. New: `src/lib/inbox/get-unread-message-count.ts`, `src/components/nav/messages-link.tsx`. Edits: `src/components/nav/site-header.tsx`, `src/components/nav/profile-menu.tsx`. Tests co-locate (`*.test.ts[x]`); e2e in `e2e/*.spec.ts`.

---

## Phase 1: Setup

**Purpose**: Confirm the working state; there is nothing to scaffold.

- [ ] T001 Confirm no schema migration and no new dependency are required (per [data-model.md](./data-model.md) — this feature reads existing feature-011 `conversations`/`messages` tables only), and kill any stale dev server on port 3000 before running e2e (a hot-reloaded server across branch switches corrupts the run).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared count primitive both stories build on. The badge value (US2) and the count-bearing accessible name (US1) both need it.

**⚠️ CRITICAL**: T002 must exist before the SiteHeader wiring (T006) can pass a real count.

- [ ] T002 Create `getUnreadMessageCount(userId: string): Promise<number>` in `src/lib/inbox/get-unread-message-count.ts`. Query 1: select `{ id, lastReadAt, createdAt }` from `conversations` where `arrayOverlaps(memberIds, [userId])` (same membership predicate as `get-inbox-list.ts`); if none, return `0` (skip query 2). Query 2: one aggregate `count(*)::int` over `messages` where `or(...conversations.map(c => and(eq(conversationId, c.id), gt(createdAt, threshold(c)))))` **AND** `or(isNull(senderId), ne(senderId, userId))`, with `threshold(c) = c.lastReadAt?.[userId] ? new Date(c.lastReadAt[userId]) : c.createdAt`. Do **not** filter `removedAt` — match `get-inbox-list.ts` exactly for parity (research.md #1). Return the count. Add a top comment citing the parity requirement (SC-002) and the deliberate `removedAt` consistency choice.
- [ ] T003 Integration test in `src/lib/inbox/get-unread-message-count.test.ts` (real DB; mirror `src/lib/inbox/get-inbox-list.test.ts` seed/teardown, scoping rows by a unique run-id token, never wiping the shared tables). Assert: (a) a message from another member after the viewer's `lastReadAt` counts; (b) after bumping the viewer's `lastReadAt` past it → `0`; (c) the viewer's own messages never count; (d) a `senderId = null` system message counts; (e) a viewer in zero conversations → `0`; (f) **parity** — the returned value equals the sum of `getInboxList(viewer)`'s real-conversation (`kind === "conversation"`) `unreadCount`s for the same viewer at the same moment. Give any rows whose relative order matters explicit `createdAt` JS `Date`s from one clock (never mix an explicit value with the schema default).

**Checkpoint**: The count is correct and proven at parity with the inbox list — before any UI depends on it.

---

## Phase 3: User Story 1 — Reach messages in one click (Priority: P1) 🎯 MVP

**Goal**: A signed-in member sees a Messages entry in the top nav beside the bell and reaches the inbox in one click; the redundant dropdown link is gone; signed-out is unchanged.

**Independent Test**: Sign in → Messages entry present in the nav → one click lands on `/inbox`. Sign out → no Messages entry. Open the avatar menu → no Inbox item. (Does not require any unread messages.)

### Tests for User Story 1

- [ ] T004 [P] [US1] Component test `src/components/nav/messages-link.test.tsx` (Vitest + Testing Library): renders an anchor to `/inbox`; **no** badge element when `unreadCount = 0` and accessible name is exactly `Messages`; badge text `3` and accessible name `Messages, 3 unread` when `unreadCount = 3`; badge text `99+` when `unreadCount = 150`.

### Implementation for User Story 1

- [ ] T005 [US1] Create `MessagesLink` **server** component in `src/components/nav/messages-link.tsx`: a `next/link` to `/inbox` styled like the bell's button box (`h-9.5 w-9.5 rounded-lg border border-border bg-surface-2`, `relative`), an `aria-hidden` ✉️ icon, and — only when `unreadCount > 0` — the same badge markup/classes as `notification-bell.tsx` (`absolute -top-1 -right-1 … bg-pop … text-white`) with label `unreadCount > 99 ? "99+" : String(unreadCount)`. `aria-label` = `unreadCount > 0 ? \`Messages, ${unreadCount} unread\` : "Messages"`. Props: `{ unreadCount: number }`.
- [ ] T006 [US1] Wire the entry into `src/components/nav/site-header.tsx`: in the signed-in branch, fetch `getUnreadMessageCount(user.id)` (add it to the existing `getNotifications` retrieval; run concurrently via `Promise.all` where practical) and render `<MessagesLink unreadCount={unread} />` in the action row immediately **before** `<NotificationBell />`. Do not touch the signed-out branch or the maintenance-mode early return.
- [ ] T007 [US1] Remove the redundant `/inbox` "Inbox" `<Link>` from `src/components/nav/profile-menu.tsx`, leaving the Profile and Log out items unchanged.
- [ ] T008 [P] [US1] E2E `e2e/inbox-nav-badge.spec.ts`: signed-in user sees the Messages nav entry and one click navigates to `/inbox`; the avatar dropdown no longer contains an Inbox link; a signed-out visitor's header shows no Messages entry; an axe check on the header passes (no new violations).

**Checkpoint**: The Messages entry is present, reachable in one click, de-duplicated from the dropdown, and signed-out is untouched — independently demoable even before badge accuracy is verified.

---

## Phase 4: User Story 2 — See unread messages at a glance (Priority: P1)

**Goal**: The Messages entry shows an accurate, capped, accessible unread-message badge that reflects real conversation activity and excludes party requests/invites.

**Independent Test**: Receive a message → badge shows the count on next render without opening it → open the conversation → badge clears on next render. A pending party request with no unread messages leaves the badge empty.

**Depends on**: T002 (count helper) and T006 (badge rendered in the header). Builds the browser-level proof that the accurate count reaches the badge; the unit-level correctness is already covered by T003.

### Tests / Verification for User Story 2

- [ ] T009 [US2] Extend `e2e/inbox-nav-badge.spec.ts`: as viewer A, have another member send A a message → on A's next page load the Messages entry shows a badge with the expected count (conversation not opened); A opens the conversation, navigates away → the badge is gone on the next render; with a pending party join-request on a posting A hosts **and** no unread messages, A's Messages badge stays empty (requests/invites are excluded — messages-only). Reuse the existing inbox e2e's message-sending helpers/seed where available; clean up any content this spec creates so it can't pollute another spec's shared-table queries.

**Checkpoint**: The badge is present *and* accurate end-to-end, and never disagrees with the inbox.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T010 [P] Update `CHANGELOG.md` and `status.md` with the 037 feature entry (`feat(037): Messages nav entry + unread badge`).
- [ ] T011 Run the [quickstart.md](./quickstart.md) manual validation checklist against `npm run dev`.
- [ ] T012 Final gate: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), and `npm run test:e2e` (Playwright) all green; confirm the e2e run count matches `playwright test --list`. Must be green before merge (Constitution Principle V).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. T003 depends on T002. Blocks the badge value.
- **US1 (Phase 3)**: T005 depends on nothing external; T006 depends on T002 (helper) + T005 (component); T007 independent; T004 independent (write first). T008 depends on T005–T007.
- **US2 (Phase 4)**: T009 depends on T002 + T006.
- **Polish (Phase 5)**: after the stories you intend to ship. T012 last.

### Within/Across Stories

- US1 is independently deliverable (entry present + one click + dropdown de-dup) without US2.
- US2 layers accuracy on top of US1's rendered badge — a deliberate, documented dependency (not a break of independence: US1 stands alone; US2 needs the badge to exist to verify it).

### Parallel Opportunities

- T004 (component test) can be written in parallel with T002/T003.
- T005 and T007 touch different files and can proceed in parallel; T006 must follow both T005 and T002.
- T008 and T009 share `e2e/inbox-nav-badge.spec.ts` → **not** parallel with each other (same file).
- T010 can run in parallel with T011.

## Parallel Example

```bash
# After T002 lands, these touch different files:
Task: "T004 Component test in src/components/nav/messages-link.test.tsx"
Task: "T005 Create MessagesLink in src/components/nav/messages-link.tsx"
Task: "T007 Remove Inbox link from src/components/nav/profile-menu.tsx"
```

## Implementation Strategy

### MVP First

1. Setup (T001) → Foundational (T002–T003, count proven at parity).
2. US1 (T004–T008) → **STOP & VALIDATE**: Messages entry reachable in one click, dropdown de-duped, signed-out clean. Demoable MVP.
3. US2 (T009) → badge accuracy proven end-to-end.
4. Polish (T010–T012) → docs + green gate → merge.

### Notes

- [P] = different files, no incomplete dependency.
- Commit per task or logical group, Conventional Commits `feat(037):` / `test(037):` (Principle VI); update CHANGELOG.md + status.md before merge.
- The whole feature is one branch (`037-inbox-nav-badge`) merged into `main` when tasks complete.
