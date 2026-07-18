---
description: "Task list for Notification Wiring — real events light up the bell"
---

# Tasks: Notification Wiring — real events light up the bell

**Input**: Design documents from `specs/040-notification-wiring/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/notify-events.md

**Tests**: INCLUDED — Constitution Principle V (test discipline) and the plan
require unit coverage for the pure parser and integration coverage for each
emitter/retrofitted action, including a "primary action survives a notification
failure" assertion.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on another incomplete task → parallelizable
- **[Story]**: US1 (P1 reply), US2 (P2 mention), US3 (P3 accept/decline)

## Path Conventions

Single Next.js app, `src/` layout, `@/*` alias (plan.md Structure Decision).

---

## Phase 1: Setup

- [x] T001 Confirm no schema migration is required: verify `notifications.type` is a
  free-text `text` column in `src/db/schema.ts` (so `declined` is additive at the
  type level only) and that the feature branch `040-notification-wiring` is checked
  out. No `drizzle-kit push` in this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the one shared module that all three emitters live in.

- [x] T002 Create the server-only module `src/lib/notifications/notify-events.ts`
  with its file-level doc comment and shared imports only (no emitters yet):
  `db`, `createNotification`, `hasActiveBlockBetween` from
  `@/lib/inbox/search-contacts`, and the needed schema tables. Establish the
  best-effort convention in a comment: every exported emitter wraps its body in
  `try/catch`, `console.error`s on failure, returns `void`, never throws.

**Checkpoint**: emitters can now be added per story.

---

## Phase 3: User Story 1 — forum reply → thread author (Priority: P1) 🎯 MVP

**Goal**: a reply to a thread creates exactly one `reply` notification for the
thread's author (not for self-replies, not across a block).

**Independent Test**: reply to another player's thread → author sees one `reply`
entry linking to the thread; self-reply and blocked-pair create none.

### Tests for User Story 1

- [x] T003 [US1] Integration tests for `notifyForumReply` in
  `src/lib/notifications/notify-events.test.ts` (real DB, seed users/thread):
  notifies the author with `type='reply'`, actor=replier, `targetRef=/forum/thread/{id}`;
  creates nothing when replier === author; creates nothing when a block exists
  between them.
- [x] T004 [US1] Amend `src/lib/actions/post-reply.test.ts`: assert the reply still
  succeeds and persists when `createNotification` is forced to throw (best-effort,
  FR-010).

### Implementation for User Story 1

- [x] T005 [US1] Implement `notifyForumReply({ threadId, threadTitle, threadAuthorId,
  replierId })` in `src/lib/notifications/notify-events.ts` per
  contracts/notify-events.md (self-exclusion, block check, one `reply` row).
- [x] T006 [US1] Wire `src/lib/actions/post-reply.ts`: after the reply insert and
  `replyCount` update, select the thread's `authorId` + `title`, then
  `await notifyForumReply(...)`. Must not change the existing success/return shape.

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — @mention → mentioned player (Priority: P2)

**Goal**: `@handle` in a forum thread or reply creates one `mention` notification
per distinct existing, non-self, non-blocked mentioned player; a reply that also
mentions the thread author yields only the `reply` notification.

**Independent Test**: post text with a real handle, an unknown handle, a duplicate,
and the author's own handle → exactly one mention for the real non-author handle;
none for the others.

### Tests for User Story 2

- [x] T007 [P] [US2] Unit tests for `extractMentionHandles` in
  `src/lib/notifications/parse-mentions.test.ts`: dedup+lowercase; email guard
  (`carol@example.com` → none); trailing punctuation (`@carol.` → `carol`);
  invalid starts (`@1bad`, `@_x` → none); empty string.
- [x] T008 [US2] Integration tests for `notifyMentions` in
  `notify-events.test.ts`: resolves a real handle to one `mention` row; ignores
  unknown handles; excludes `excludeUserIds` (actor + thread author); dedups repeated
  handles; skips a blocked mentioned user.

### Implementation for User Story 2

- [x] T009 [P] [US2] Implement the pure parser
  `src/lib/notifications/parse-mentions.ts` — `extractMentionHandles(text): string[]`
  with grammar `/(?<![A-Za-z0-9])@([A-Za-z][A-Za-z0-9]{0,23})/g`, deduped
  case-insensitively, lowercased. No `db` import.
- [x] T010 [US2] Implement `notifyMentions({ actorId, threadId, threadTitle, body,
  excludeUserIds })` in `notify-events.ts`: parse → resolve handles to users
  (case-insensitive) → drop excluded/blocked → one `mention` row each.
- [x] T011 [US2] Wire mentions into both writers: in `post-reply.ts` call
  `notifyMentions({ excludeUserIds: [replierId, threadAuthorId], ... })`; in
  `src/lib/actions/create-thread.ts`, after the thread insert, call
  `notifyMentions({ excludeUserIds: [authorId], threadTitle: title, body, ... })`.
- [x] T012 [US2] Amend `src/lib/actions/create-thread.test.ts`: a thread mentioning a
  real other user creates one `mention`; a self-mention creates none; the create
  still succeeds when the notification write throws.

**Checkpoint**: US1 + US2 both work; reply-vs-mention dedupe verified.

---

## Phase 5: User Story 3 — accept/decline → applicant (Priority: P3)

**Goal**: accepting or declining an applicant-initiated request notifies the
applicant (`accepted` / new `declined`); the host's own view is unchanged; the
host-initiated-invite flow is not re-notified.

**Independent Test**: as host, accept one request and decline another → each
applicant gets one correct notification; host sees no new/doubled item.

### Type + display (needed by this story only)

- [x] T013 [P] [US3] Add `"declined"` to the `NotificationType` union in
  `src/lib/notifications/create-notification.ts`.
- [x] T014 [P] [US3] Add the `"declined"` case to `categoryOf` (→ `"requests"`) in
  `src/lib/notifications/filter-notifications.ts`, and a `declined` entry to
  `TYPE_ICON` (distinct `✕` + muted-red, not the green `✓`) in
  `src/components/notifications/notifications-list.tsx`.

### Tests for User Story 3

- [x] T015 [US3] Integration tests for `notifyRequestResolved` + wiring in
  `notify-events.test.ts` / the accept+decline test files: applicant gets
  `accepted`/`declined` (actor=host, `targetRef=/listing/{postingId}`); a
  block skips it; a host-initiated invite (`initiatedBy='host'`) notifies no one;
  accept still succeeds with conversation + seat count intact when the
  notification write throws (FR-011, post-transaction seam).

### Implementation for User Story 3

- [x] T016 [US3] Implement `notifyRequestResolved({ kind, applicantId, hostId,
  postingId, game, title })` in `notify-events.ts` (one row of `kind` to the
  applicant, actor=host, block check).
- [x] T017 [US3] Wire `src/lib/actions/accept-request.ts`: after the transaction
  resolves, if `application.initiatedBy !== "host"`, read the posting `game`/`title`
  and `await notifyRequestResolved({ kind: "accepted", ... })` — outside the
  transaction.
- [x] T018 [US3] Wire `src/lib/actions/decline-request.ts`: after the status update,
  if `application.initiatedBy !== "host"`, read the posting `game`/`title` and
  `await notifyRequestResolved({ kind: "declined", ... })`.

**Checkpoint**: all three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [x] T019 [P] Add a `filterAndGroupNotifications` test case in
  `src/lib/notifications/filter-notifications.test.ts` asserting a `declined` item
  falls under the `requests` filter.
- [x] T020 [P] Update `docs/future-work.md`: mark the "Wiring other features' write
  actions to createNotification()" entry as partially resolved by 040 (reply,
  mention, applicant accept/decline done; DM/news/all-participants still deferred)
  and ensure "notify all thread participants" is explicitly listed.
- [x] T021 [P] Update `CHANGELOG.md` and `status.md` for feature 040.
- [x] T022 Run `npm run typecheck`, `npm run lint`, `npm test` (Vitest) and confirm
  green; then walk `quickstart.md` US1–US3 against a local dev server (kill any
  stale dev server on :3000 first).

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002)** blocks all stories (they add emitters
  to `notify-events.ts`).
- **US1 (T003–T006)** = MVP; deliver and validate before US2/US3 if desired.
- **US2 (T007–T012)**: parser (T009) is independent [P]; T010–T012 depend on T002.
  T011 edits `post-reply.ts` (also touched by T006) → sequence after T006.
- **US3 (T013–T018)**: T013/T014 are independent display edits [P]; T016–T018 depend
  on T002; T015 depends on T016.
- **Polish (T019–T022)** after the relevant stories.

### Same-file sequencing (not [P] with each other)

- `notify-events.ts`: T002 → T005 → T010 → T016.
- `post-reply.ts`: T006 → T011.

### Parallel opportunities

- T007 + T009 (parse-mentions test + impl) run alongside US1.
- T013 + T014 (type + display) run in parallel with each other.
- T019 + T020 + T021 polish docs/tests in parallel.

---

## Implementation Strategy

**MVP** = Phase 1 + 2 + US1 (forum reply → author): the single clearest gap,
shippable and demoable on its own. Then layer US2 (@mentions) and US3
(accept/decline → applicant) as independent increments, each with its own tests
green before moving on. Commit per task or logical group (Conventional Commits,
Principle VI); update CHANGELOG/status and merge to `main` when all tasks pass CI.
