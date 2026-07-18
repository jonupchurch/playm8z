---
description: "Task list for owner-only permanent delete of news posts"
---

# Tasks: Owner-only permanent delete for news posts

**Input**: Design docs in `specs/041-owner-hard-delete-news/`

**Tests**: INCLUDED (Principle V) — the owner gate and the destructive delete are
security/data seams and are covered by integration + component tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task
- **[Story]**: US1 (P1 permanent delete), US2 (P2 relabel)

---

## Phase 1: Setup / Foundational

- [ ] T001 Add `isOwner: boolean("isOwner").notNull().default(false)` to the `user`
  table in `src/db/schema.ts`, then apply it to the LOCAL db with an idempotent
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isOwner" boolean NOT NULL DEFAULT
  false;` and verify the column landed by querying.
- [ ] T002 Create `src/lib/auth/require-owner.ts` exporting
  `isCurrentUserOwner(): Promise<boolean>` — reads the session user's `isOwner`
  fresh from the DB by session email (mirrors `require-role.ts`'s `lookupRole`);
  `false` when no session or flag off. Server-only.
- [ ] T003 Add `permanentDeleteSchema = z.object({ postId: z.string().uuid() })`
  to `src/lib/validations/admin-news.ts`.

**Checkpoint**: owner marker exists and is checkable server-side.

---

## Phase 2: User Story 1 — owner permanent delete (Priority: P1) 🎯 MVP

**Goal**: the owner (and only the owner) can permanently remove a news post, with
confirm + audit.

**Independent Test**: owner deletes → gone from feed/admin/storage + likes/saves
gone + audit entry; non-owner → refused; control hidden for non-owner/new post.

### Tests

- [ ] T004 [US1] `src/lib/actions/delete-news-post.test.ts` (real DB, mock
  `@/auth`, seed a user with `isOwner=true` and one with `isOwner=false`, a post
  with a like/save): owner delete removes the post + cascades likes/saves + writes
  exactly one audit entry with `targetLabel`=title; a non-owner is refused and the
  post remains; a missing post fails gracefully.
- [ ] T005 [US1] `src/components/admin/news-post-editor.test.tsx`: "Delete
  permanently" is rendered only when `isOwner` and the post exists; not for a
  non-owner; not for a new post; and it fires only after the two-step confirm.

### Implementation

- [ ] T006 [US1] `src/lib/actions/delete-news-post.ts` —
  `deleteNewsPostPermanently({postId})`: Zod (`permanentDeleteSchema`); refuse via
  `{success:false}` unless `isCurrentUserOwner()`; load the title (→ "Post not
  found." if absent); `db.delete(newsPosts)`; `logAuditEntry(... "permanently
  deleted a news post", category:"content", targetType:"newsPost", targetId,
  targetLabel)`; `revalidatePath("/admin/news","layout")` +
  `revalidatePath("/news","layout")`; `{success:true}`.
- [ ] T007 [US1] Wire the UI: in `src/app/admin/news/page.tsx` compute
  `const isOwner = await isCurrentUserOwner()` and pass it to `<NewsPostEditor>`
  (leave `isAdmin` untouched). In `src/components/admin/news-post-editor.tsx`
  accept `isOwner`; when `isOwner && isExisting`, render an owner-only "Delete
  permanently" button with an inline two-step confirm calling
  `deleteNewsPostPermanently` and, on success, navigating back to `/admin/news`.

**Checkpoint**: US1 fully functional.

---

## Phase 3: User Story 2 — relabel "Delete" → "Unpublish" (Priority: P2)

**Goal**: the existing soft-remove button honestly reads "Unpublish"; behavior
unchanged.

**Independent Test**: button reads "Unpublish"; clicking it still moves the post
to draft.

### Implementation + test

- [ ] T008 [US2] In `src/components/admin/news-post-editor.tsx`, relabel the
  existing `submit("delete")` button text "Delete" → "Unpublish" (behavior and
  the `save-news-post.ts` action unchanged).
- [ ] T009 [US2] Assert in `news-post-editor.test.tsx` that the soft-remove button
  reads "Unpublish" (and, for an existing post as non-owner, it is the only
  delete-ish control shown).

**Checkpoint**: US1 + US2 both done.

---

## Phase 4: Provisioning, prod, docs

- [ ] T010 [P] Create `scripts/set-owner.ts` (idempotent): reads `OWNER_EMAIL`
  (default `jonupchurch@gmail.com`), sets `isOwner=true` for that account in
  `DATABASE_URL`. Run against LOCAL; verify by query.
- [ ] T011 Apply the column + provision to PROD: idempotent `ALTER … ADD COLUMN IF
  NOT EXISTS` and `scripts/set-owner.ts` against prod (prod `DATABASE_URL` pulled
  to a temp path outside the repo, used, deleted). Verify both by query.
- [ ] T012 [P] Update `CHANGELOG.md` (note: admin/owner-only — NO player-facing
  Patch Notes post, per the patch-notes workflow scope), `status.md`, and
  `docs/future-work.md` (log the deferred extensions: other content types, an
  ownership-transfer UI, a visible owner badge).
- [ ] T013 Run `npm run typecheck`, `npm run lint`, `npm test` green; walk
  `quickstart.md` US1 + US2 locally.

---

## Dependencies

- T001 → T002 → (T004/T005 tests, T006/T007 impl). T003 before T006.
- US2 (T008/T009) is independent of US1 and can land first (pure relabel).
- T010 after T001/T002; T011 after the feature is verified locally; T012/T013 last.
- Same-file sequencing: `news-post-editor.tsx` T007 → T008 (both edit it).
