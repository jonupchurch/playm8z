# Quickstart: Real Image Upload for News Post Covers

## Prerequisites

- A Vercel Blob store provisioned and attached to the project (`vercel blob create-store`), `BLOB_READ_WRITE_TOKEN` present in `.env.local` and in Vercel's Production/Preview env vars (research.md #6).
- Local Postgres running (no schema change for this feature).
- A seeded `moderator`-or-higher user (see any existing Admin News e2e spec's `beforeAll` for the pattern).

## Manual validation

1. Log in as the seeded moderator, go to `/admin/news`, start a new or existing post.
2. In the Cover section, use the new upload control to select a real image file (jpeg/png/webp). Confirm the live preview updates to the real image, and the four gradient swatches remain visible/clickable.
3. Save/publish the post. Confirm the real image renders correctly on: the News feed card, the featured post (if applicable), the article's own `/news/[slug]` page, "Keep reading"/related lists, and (as a different logged-in reader) Profile's Saved tab after saving the article.
4. Re-upload a different image on the same post; confirm it replaces the first everywhere.
5. Click a gradient swatch instead; confirm the cover reverts to the gradient everywhere.
6. Attempt to upload a non-image file (e.g. a `.txt`) and an oversized image; confirm both are rejected with a clear error and the existing cover is untouched.
7. Load an already-published post that has always used a gradient (seeded before this feature); confirm its appearance is completely unchanged everywhere.

## Automated validation

**Vitest** (`upload-news-cover-image.test.ts`, `@vercel/blob` mocked):
1. A moderator-or-higher session succeeds; a plain `user` session is rejected.
2. A non-image file type is rejected before any Blob call is made.
3. An oversized file is rejected before any Blob call is made.
4. A valid upload calls `put()` with `access: "public"` and returns its URL.

**Playwright** (extend `e2e/admin-news.spec.ts`): a real seeded moderator sees the upload control in the Cover section; a plain non-moderator/logged-out session does not reach the page at all (existing gate, unchanged). Does not perform a real upload (research.md #5).

**Manual, once, live** (this feature's real end-to-end proof, per research.md #5): actually upload a real image against the real provisioned Blob store, confirm the returned URL renders correctly via `newsCoverStyle()` in a real browser.

## Expected outcome

All of spec.md's acceptance scenarios (US1, 1–6) pass; SC-001–SC-004 are satisfied.
