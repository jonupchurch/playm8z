# Quickstart: Validating Content Page

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up, with a seeded `contentPages` row (e.g.
slug `community-guidelines`, `status = published`, a handful of
blocks covering every type) and a test account with moderator-or-
higher role.

## Setup

```bash
npm run dev
```

## Scenario 1 — Public read

1. Visit the seeded page's URL **without logging in** — confirm the
   title and every block type render correctly, in order.
2. Visit a slug that's never existed — confirm the 404 state.
3. Manually set the seeded page's `status` to `draft` (via
   `db:studio`) and revisit as a logged-out visitor — confirm the 404
   state now, not draft content. Set it back to `published`.

## Scenario 2 — Moderator edits inline

1. Log in as the moderator-or-higher test account, visit the page —
   confirm "Edit page" is visible (and isn't for a non-moderator
   account).
2. Enter edit mode, add a new block of each type, reorder two blocks,
   edit a paragraph's text and the title.
3. Select "Save changes" — confirm the page reflects every change on
   reload.
4. Re-enter edit mode, make more changes, select "Cancel" instead —
   confirm nothing changed from the last save.

## Scenario 3 — Publish/unpublish

1. As the moderator account, unpublish the page.
2. Confirm a logged-out visitor now sees the 404 state for it.
3. Publish it again — confirm it's visible to everyone again.
4. Confirm the moderator account could view and edit the page the
   entire time, regardless of its status.

## Automated tests

- `npm test` — unit tests for the block discriminated-union Zod
  schema; integration tests for `save-content-page.ts` (including the
  role-gate rejection) and `toggle-page-status.ts`.
- `npm run test:e2e` — `e2e/content-page.spec.ts` covering Scenarios
  1-3, with an axe-core accessibility scan of the edit mode.
