# Quickstart: Admin News

## Prerequisites

- Local dev DB migrated with this feature's schema changes
  (`newsPosts.body`, `newsPosts.status`).
- A moderator-or-higher session, plus a regular-user session (to
  confirm access denial and to view the public feed).
- Seed data: at least one post per status (draft/published/scheduled),
  one of them `featured = true`.

## Manual Scenarios

1. **List and filter** — as a moderator, visit `/admin/news`. Confirm
   every seeded post appears with an accurate status badge, date, and
   pin indicator. Select each filter (All/Published/Drafts/Scheduled)
   and confirm the list narrows correctly.

2. **Load into editor** — select a row; confirm the editor loads that
   exact post's cover, title, category, excerpt, body, status, and pin
   state.

3. **Live preview** — in the editor (new or existing post), change the
   title, excerpt, category, and cover; confirm the live preview panel
   updates immediately for each change, before saving.

4. **Publish now** — create a new post, leave status at its default,
   select the primary button ("Publish now"); confirm it appears on
   the public News feed (`013`) with `publishedAt` set to just now.

5. **Schedule** — create another post, select "Scheduled" and a future
   date, select "Schedule"; confirm it does NOT appear on the public
   feed yet, and its status shows "Scheduled" in this feature's own
   list.

6. **Update preserves publish date** — edit the already-published post
   from Scenario 4 (e.g. fix a typo), select "Update"; confirm its
   original `publishedAt` is unchanged and the public feed's ordering
   for that post doesn't jump.

7. **Save draft override** — open any post, set the status control to
   "Published," then select "Save draft" instead of the primary
   button; confirm it saves as `draft` regardless of the on-screen
   status selection.

8. **Pin exclusivity** — pin the post from Scenario 4; confirm it's
   `featured`. Pin a different post; confirm the first is
   automatically un-pinned.

9. **Delete as unpublish** — select "Delete" on an existing published
   post; confirm it becomes `status = 'draft'` (not removed), no
   longer appears on the public feed, but still appears in this
   feature's own list and remains editable.

10. **Access control** — attempt to visit `/admin/news` as a regular
    (non-moderator) user; confirm access-denied per Error Pages'
    behavior.

11. **Scheduled post goes live automatically** — advance past the
    scheduled post's publish date/time (or seed one already in the
    past with `status = 'scheduled'`); confirm it now appears on the
    public feed without any admin action, purely from the amended
    `search-news.ts` query.

## Automated tests

- Unit: `admin-news.ts` Zod schemas (incl. the `schedule`-requires-
  future-date refinement); `save-news-post.ts`'s status/`publishedAt`/
  `featured` branching per `action` (research.md #1, #5); `013`'s
  amended `search-news.ts` (extended) for the scheduled-post
  read-time inclusion logic (research.md #3).
- Integration: the at-most-one-`featured` invariant under a
  transaction; role-gate rejection on `save-news-post.ts`.
- E2E (`e2e/admin-news.spec.ts`): list/filter/load, live preview,
  publish/schedule/update/save-draft/delete, pin exclusivity, access
  denial, with an axe-core scan.
