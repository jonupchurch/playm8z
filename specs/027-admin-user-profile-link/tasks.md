---

description: "Task list for Admin Users Drawer — View Full Profile in a New Tab"
---

# Tasks: Admin Users Drawer — View Full Profile in a New Tab

**Input**: Design documents from `/specs/027-admin-user-profile-link/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md (no data-model.md/contracts — none apply, see plan.md)

**Tests**: Included — Principle V (Test Discipline) and plan.md's Technical Context call for e2e coverage as the right layer for this change; write it first so it demonstrably fails before the control exists.

**Organization**: One user story (this feature is small and atomic enough that splitting further would be artificial — see spec.md's own note). No Setup or Foundational phases: this feature adds nothing to the project's scaffolding, infrastructure, schema, or auth framework — every task below touches only the two files plan.md identified.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: User Story 1 - Cross-reference a user's public profile while moderating (Priority: P1) 🎯 MVP

**Goal**: A moderator can open any drawer-visible user's real public profile in a new tab, from the Admin Users drawer, without disturbing the admin queue.

**Independent Test**: Run `npx playwright test e2e/admin-users.spec.ts` — the new describe block logs in as a real seeded moderator, opens the drawer, and verifies the control's destination/attributes and its presence for every account status.

### Tests for User Story 1 ⚠️

> Write this first; confirm it fails (control doesn't exist yet) before starting implementation.

- [ ] T001 [US1] In `e2e/admin-users.spec.ts`, add a new `describe` block: seed a real `role: "moderator"` user plus two target users (one plain/active, one with `bannedAt` set) via `db.insert(users)`, log in as the moderator through the real `/login` form (reuse this file's existing `login()` helper), open the drawer for each target user (`/admin/users?userId=<id>`), and assert: (a) a control with accessible name "View full profile" is visible; (b) its `href` equals `/u/<target handle>`; (c) its `target` attribute is `_blank` and its `rel` attribute contains both `noopener` and `noreferrer`; (d) the control is present and identical for both the active and the banned target user (not conditionally hidden). Include `afterAll` cleanup deleting all seeded rows by `runId`.

### Implementation for User Story 1

- [ ] T002 [US1] In `src/components/admin/user-drawer.tsx`, add an `<a>` control reading `detail.handle` (already on the `UserDetail` type) with `href={`/u/${detail.handle}`}`, `target="_blank"`, `rel="noopener noreferrer"`, and visible/accessible text "View full profile" — styled with the drawer's existing token classes (`border-border`, `text-text`, matching the visual weight of a secondary action, distinct from the primary Ban/Unban button) and placed near the header/status area. Render it unconditionally for every `status()` value (active/flagged/banned) — no status-based hiding. Confirm T001 now passes.
- [ ] T003 [US1] In `e2e/admin-users.spec.ts`, remove the now-stale header comment claiming the drawer's content "can't be exercised end-to-end" (research.md #3) — T001 just did exactly that through a real seeded moderator session, matching the pattern already used in `e2e/audit-log.spec.ts` / `e2e/admin-settings.spec.ts` since Admin Settings (024) shipped the real `role` column.

**Checkpoint**: User Story 1 is fully functional and independently testable — `npx playwright test e2e/admin-users.spec.ts` green, manual steps in `quickstart.md` pass.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [ ] T004 [P] Add entry 27 to `docs/feature-list.md` describing this as a small enhancement to already-shipped feature 016 (Admin Users), per Principle VI and this project's per-feature tracking convention.
- [ ] T005 [P] Update `CHANGELOG.md` and `status.md` to reflect this feature, per Principle VI.
- [ ] T006 Run `quickstart.md`'s manual validation steps once against a running dev server (real click, confirm new tab, confirm original tab/queue state untouched).
- [ ] T007 Run `npm run typecheck && npm run lint && npm test && npm run test:e2e` — all green before merge, per Principle V / CI (`.github/workflows/ci.yml`).

---

## Dependencies & Execution Order

- **T001** has no dependencies — write and confirm it fails first.
- **T002** depends on T001 existing (so its pass/fail is meaningful); makes T001 pass.
- **T003** depends on T002 (the comment is only actually false once the control — and T001's coverage of it — exists).
- **T004**/**T005** depend on T001–T003 being complete (describing finished work) but not on each other — can run in parallel.
- **T006**/**T007** depend on all of T001–T005 being complete; **T007** last, as the final merge gate.

## Parallel Example

```bash
# Once T001-T003 are done, these two touch different files and have no dependency on each other:
Task: "Add entry 27 to docs/feature-list.md"
Task: "Update CHANGELOG.md and status.md"
```

## Implementation Strategy

Single-story MVP: T001 → T002 → T003 delivers and proves the entire feature; T004–T007 are documentation/verification close-out, not additional product scope. There is no incremental multi-story rollout to plan since spec.md deliberately has only one user story.
