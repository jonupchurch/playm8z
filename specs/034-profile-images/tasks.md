# Tasks: Profile Images

**Feature**: `034-profile-images` | **Plan**: [plan.md](./plan.md)

`[P]` = parallelisable with neighbours. Phases ordered by hard dependency.

## Phase A — Schema

- [ ] **T001** Add `users.avatarImage` (text, nullable, no default) to
      `src/db/schema.ts`, with a comment: uploaded avatar, distinct from
      `image` (Google, adapter-owned) and `avatarColor` (gradient fallback).
- [ ] **T002** `npx drizzle-kit push`. **Verify by querying the DB** that the
      column exists and every existing row is NULL (no backfill) — not by the
      exit code.

## Phase B — The shared Avatar component (build & prove BEFORE migrating)

- [ ] **T003** `src/components/ui/avatar.tsx`. Props: `avatarImage`,
      `googleImage`, `avatarColor`, `handle`, `size` (`sm|md|lg|xl` → the real
      sizes: h-8/9, h-10/11, h-12, h-23). Renders FR-005 precedence. The image
      is a client piece with `onError` → gradient block (FR-007). Image props
      required (not optional-defaulting) so a call site that forgets to pass
      them is a type error, not a silent gradient.
- [ ] **T004** [P] Unit tests for T003: shows uploaded image when set; shows
      Google image when only that is set; shows gradient+initial when neither;
      `onError` falls back to gradient; correct initial for odd handles
      (empty, non-letter first char). This is the contract every migrated
      site inherits — exhaustive here means cheap everywhere.

## Phase C — Upload / remove action (trust boundary)

- [ ] **T005** `src/lib/actions/update-avatar.ts`: `uploadAvatar(formData)`
      — `requireAuth()`, server-validate type (JPEG/PNG/WebP) + size (5MB)
      reusing 029's checks, `put()` under `avatars/`, set `avatarImage`, then
      `del()` the prior blob (order: new first, then delete old). Plus
      `removeAvatar()` — `requireAuth()`, `del()`, set NULL. Both
      `revalidatePath()`.
- [ ] **T006** [P] Unit tests for T005 (mock `@vercel/blob` as 029's tests
      do): rejects wrong type; rejects oversize; sets the column on success;
      `del()`s the prior blob on replace; NULLs on remove; another user's id
      can't be targeted (own-account only).

## Phase D — Migrate the 30 avatar sites to `<Avatar>`

Each task: swap the inline gradient/initial markup for `<Avatar>` **and
widen that surface's data query** to select `avatarImage` + `image`
alongside `avatarColor`. Built by reading each file — the target is the
gradient-bg + handle-initial + `text-on-accent` pattern; leave
`bg-surface text-text-dim` icon boxes alone.

- [ ] **T007** Nav (highest visibility, easiest to forget):
      `nav/site-header.tsx`, `nav/profile-menu.tsx`. The top-right avatar —
      if missed, the header shows the Google photo while the rest shows the
      upload.
- [ ] **T008** [P] Profile: `profile/profile-header.tsx`,
      `app/profile/layout.tsx`, `app/profile/saved/page.tsx`,
      `profile/profile-in-common.tsx`, `profile/profile-reviews.tsx`.
- [ ] **T009** [P] Listings: `listings/listing-card.tsx`,
      `app/listing/[id]/page.tsx`, `listing/qa-thread.tsx`,
      `listing/roster.tsx`.
- [ ] **T010** [P] Forum: `forum/original-post.tsx`, `forum/reply-card.tsx`,
      `forum/thread-row.tsx`.
- [ ] **T011** [P] Inbox & notifications: `inbox/compose-modal.tsx`,
      `inbox/conversation-list.tsx`, `notifications/notifications-list.tsx`.
- [ ] **T012** [P] Blocking: `blocking/block-modal.tsx`,
      `blocking/blocked-users-client.tsx`, `blocking/unblock-modal.tsx`.
- [ ] **T013** [P] Admin: `admin/user-table.tsx`, `admin/user-drawer.tsx`,
      `admin/settings-roles.tsx`, `admin/forum-queue.tsx`,
      `admin/forum-review-drawer.tsx`, `admin/posting-queue.tsx`,
      `admin/posting-review-drawer.tsx`, `admin/reports-queue.tsx`,
      `admin/report-review-drawer.tsx`.
- [ ] **T014** Onboarding: `auth/onboarding-wizard.tsx` — the avatarColor
      picker preview. This one shows a *chosen colour* live, so it may keep
      using the gradient directly; migrate only if `<Avatar>` cleanly
      supports "colour preview, no user yet." Note the decision either way.
- [ ] **T015** Grep sweep: after T007-T014, `grep -rn "AVATAR_COLORS.find\|
      avatarGradient" src` should return only `<Avatar>`'s own internals and
      any deliberately-kept site (T014). Any other hit is a missed surface.

## Phase E — Upload UI

- [ ] **T016** Add the avatar uploader to `profile/account-forms.tsx`:
      current avatar via `<Avatar size="xl">`, a Replace control (hidden file
      input, `accept="image/jpeg,image/png,image/webp"`, `FormData`,
      `try/catch` around the action — 029's bug was a missing catch), a Remove
      control, pending + error states.
- [ ] **T017** [P] Component tests for T016: pending state; error surfaces on
      a rejected file; Remove is hidden/disabled when there's no uploaded
      image (nothing to remove).

## Phase F — E2E & close-out

- [ ] **T018** E2E: sign in → account settings → upload → assert the photo
      shows on the profile header **and on a second surface** (a listing card
      or forum reply) — this is FR-008/SC-003, and asserting only the surface
      it was set on would pass a per-page bug.
- [ ] **T019** [P] E2E: remove the uploaded photo → avatar falls back (to the
      gradient block for a credentials account with no Google photo).
- [ ] **T020** Update the ~10 avatar-rendering component tests whose DOM the
      shared component changed (known: `listing-card.test.tsx`).
- [ ] **T021** Full verification: typecheck, lint, Vitest, Playwright.
      Cross-check the e2e reporter count against `playwright test --list`.
