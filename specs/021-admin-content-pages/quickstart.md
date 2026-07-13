# Quickstart: Admin Content Pages

## Prerequisites

- Local dev DB migrated with this feature's schema change
  (`contentPages.system`) and its own seed data (the three system
  pages) plus `014`'s existing `ContentPage`/`toggle-page-status.ts`.
- A moderator-or-higher session, plus a regular-user session.
- Seed data (beyond the three system pages): at least one published
  custom page and one draft custom page.

## Manual Scenarios

1. **Stats and table accuracy** — as a moderator, visit
   `/admin/content-pages`. Confirm the four stats cards (total,
   published, drafts, system) match a direct count, including the
   three seeded system pages.

2. **Search and filter** — search by a page's title, then by a
   fragment of its slug; confirm matches narrow correctly. Select
   each filter (All/Published/Drafts/System) and confirm the table
   narrows accordingly.

3. **Publish/Unpublish** — unpublish a published custom page; confirm
   its status badge updates immediately, the stats update, and it no
   longer renders on its public slug. Publish it again and confirm it
   reappears.

4. **View/Edit navigation** — select "View" on a page; confirm it
   opens that page's public slug. Select "Edit"; confirm it opens the
   same slug with `014`'s existing inline-edit affordance available
   (as a moderator).

5. **Create a page** — select "+ New page"; confirm a new "Untitled
   page" draft appears in the list with a unique, auto-generated slug
   (e.g. `/untitled-page`, or `-2` if already taken).

6. **Delete a custom page** — select the delete icon on a custom
   page; confirm an inline "Delete? Yes/No" prompt replaces its normal
   actions. Confirm; verify its status is now `draft` (not removed —
   still present in this feature's own list) and it no longer renders
   publicly. Select "No" on a different page's delete prompt and
   confirm it cancels, restoring normal actions.

7. **System pages never offer Delete** — confirm none of the three
   system pages' rows show a delete affordance, showing a 🔒 indicator
   in its place instead; confirm Publish/Unpublish IS still available
   on them.

8. **Access control** — attempt to visit `/admin/content-pages` as a
   regular (non-moderator) user; confirm access-denied per Error
   Pages' behavior.

## Automated tests

- Unit: `admin-content-pages.ts` Zod schemas; `search-content-pages.ts`'s
  search/filter logic; `create-content-page.ts`'s unique-slug
  generation (research.md #4, incl. the collision/suffix case).
- Integration: `create-content-page.ts` (role-gate rejection);
  `delete-content-page.ts` (sets `status = 'draft'`, never removes
  the row; rejected for `system = true` pages; role-gate rejection).
- E2E (`e2e/admin-content-pages.spec.ts`): stats/search/filter,
  publish/unpublish via `014`'s reused action, page creation,
  view/edit navigation, delete-confirm flow, system-page Delete
  restriction, access denial, with an axe-core scan.
