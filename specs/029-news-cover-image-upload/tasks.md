---

description: "Task list for Real Image Upload for News Post Covers"
---

# Tasks: Real Image Upload for News Post Covers

**Input**: Design documents from `/specs/029-news-cover-image-upload/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md, `docs/adr/0008-news-cover-images-via-vercel-blob.md` (no data-model.md/contracts — none apply, see plan.md)

**Tests**: Included — Principle V, and this feature has real logic (file validation, the Blob call, the gradient/image render distinction) worth proving with `@vercel/blob` mocked (research.md #5).

**Organization**: One user story (spec.md's own note: uploading and displaying correctly everywhere are tightly coupled). A Foundational phase carries the shared render-helper refactor, since all 6 existing consumers need it regardless of whether any image has been uploaded yet (it also governs how already-published gradient-only posts keep rendering).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Setup/Foundational/Polish tasks have no story label

---

## Phase 1: Setup

**Purpose**: External provisioning this feature genuinely needs.

- [ ] T001 Provision a Vercel Blob store (`vercel blob create-store`), add `BLOB_READ_WRITE_TOKEN` to `.env.local` (the same safe, targeted way `AI_GATEWAY_API_KEY` was added for feature 028 — never a wholesale `vercel env pull`) and to Vercel's Production/Preview env vars, and document it in `.env.example`.
- [ ] T002 [P] Install `@vercel/blob`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared gradient/image render distinction every consumer (including already-published posts) depends on.

**⚠️ CRITICAL**: T004–T009 depend on T003; they don't depend on Setup.

- [ ] T003 [P] Create `src/lib/news/cover-style.ts` exporting `newsCoverStyle(cover: string | null, fallbackGradient: string): CSSProperties` (research.md #4 — a value starting with `http` renders as a real image via `backgroundImage`/`backgroundSize: "cover"`/`backgroundPosition: "center"`; anything else renders exactly as today, `{ background: cover ?? fallbackGradient }`). Include its own unit test (`cover-style.test.ts`) covering both branches plus the `null` fallback.
- [ ] T004 [P] Adopt `newsCoverStyle()` in `src/components/news/news-post-card.tsx`, replacing its inline `style={{ background: post.cover ?? fallback }}`.
- [ ] T005 [P] Adopt `newsCoverStyle()` in `src/components/news/featured-post.tsx`.
- [ ] T006 [P] Adopt `newsCoverStyle()` in `src/components/news/article-related.tsx`.
- [ ] T007 [P] Adopt `newsCoverStyle()` in `src/app/news/[slug]/page.tsx` (article detail).
- [ ] T008 [P] Adopt `newsCoverStyle()` in `src/app/profile/saved/page.tsx` (Saved tab).
- [ ] T009 [P] Adopt `newsCoverStyle()` in `src/components/admin/news-post-list.tsx` (admin list thumbnail).

**Checkpoint**: Every existing surface renders the same as before for a gradient-only post (verify by running the full e2e suite here — no visual regression, FR-005/SC-004) — ready for the upload capability itself.

---

## Phase 3: User Story 1 - Upload a real cover image instead of picking a color (Priority: P1) 🎯 MVP

**Goal**: A moderator-or-higher can upload a real image as a News post's cover, and it displays correctly everywhere (already covered by Phase 2's adoption).

**Independent Test**: Upload an image, save the post, confirm it renders on every surface from Phase 2's checkpoint; confirm a non-moderator never sees the upload control.

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Vitest for `upload-news-cover-image.ts` in `src/lib/actions/upload-news-cover-image.test.ts`: `vi.mock("@vercel/blob")` so no real network write is made; assert a real seeded `moderator` (or `admin`) session succeeds; assert a real seeded plain `user` session is rejected; assert a non-image file type is rejected before any Blob call; assert an oversized file is rejected before any Blob call; assert a valid upload calls `put()` with `access: "public"` and returns its URL.
- [ ] T011 [US1] Extend `e2e/admin-news.spec.ts`: a real seeded moderator session sees the upload control in the Cover section of the News editor — gate/presence only, no real upload triggered (research.md #5, matching feature 028's own e2e philosophy for an external-call boundary Playwright can't intercept).

### Implementation for User Story 1

- [ ] T012 [US1] Implement `src/lib/actions/upload-news-cover-image.ts`: `requireRole("moderator")`, validate `file.type` against an allow-list (`image/jpeg`, `image/png`, `image/webp`) and `file.size` against the 5MB cap (plain checks, research.md #3 — no Zod-on-File), call `put()` with `access: "public"`, return the resulting URL. Confirm T010 passes.
- [ ] T013 [US1] In `src/components/admin/news-post-editor.tsx`'s Cover section: add a labeled file-upload control (`accept="image/jpeg,image/png,image/webp"`) alongside the existing 4 gradient swatches, a clear in-progress state while uploading, an error state that leaves the current `cover` value untouched on rejection/failure, and on success calls the component's existing `setCover(url)`. Adopt `newsCoverStyle()` for the live preview block too. Confirm T011 passes.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Add entry 29 to `docs/feature-list.md`.
- [ ] T015 [P] Update `CHANGELOG.md` and `status.md` per Principle VI.
- [ ] T016 Manually verify a real, live upload against the real provisioned Blob store (research.md #5) — this feature's actual end-to-end proof, since e2e deliberately doesn't cover it.
- [ ] T017 Run `npm run typecheck && npm run lint && npm test && npm run test:e2e` — all green before merge.

---

## Dependencies & Execution Order

- **Setup (T001–T002)**: No dependencies; T001 blocks T016/T012's real Blob call, not the mocked tests.
- **Foundational (T003–T009)**: T003 first (the helper); T004–T009 depend only on T003, not on each other or on Setup.
- **User Story 1 (T010–T013)**: T010/T011 (tests) before T012/T013 (implementation). Depends on T003 (the helper) and T002 (`@vercel/blob` installed); does not depend on T004–T009 being finished, though running the full e2e suite as Phase 2's checkpoint first is good practice.
- **Polish (T014–T017)**: Depends on everything above; T016 additionally depends on T001; T017 is the final gate.

## Parallel Example: Foundational Phase

```bash
# Once T003 exists:
Task: "Adopt newsCoverStyle() in news-post-card.tsx"
Task: "Adopt newsCoverStyle() in featured-post.tsx"
Task: "Adopt newsCoverStyle() in article-related.tsx"
Task: "Adopt newsCoverStyle() in news/[slug]/page.tsx"
Task: "Adopt newsCoverStyle() in profile/saved/page.tsx"
Task: "Adopt newsCoverStyle() in news-post-list.tsx"
```

## Implementation Strategy

Single-story MVP: Setup + Foundational (render-safety first, provable via the existing e2e suite with zero regressions) → User Story 1 (T010–T013) delivers and proves the entire feature → Polish closes it out. No incremental multi-story rollout to plan, per spec.md's own single-story structure.
