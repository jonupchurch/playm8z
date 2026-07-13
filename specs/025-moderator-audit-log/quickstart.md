# Quickstart: Moderator audit log

## Prerequisites

- Local dev DB with `015`'s existing `auditEntries` table, seeded with
  entries across all four categories (incl. at least one with
  `actorId = null`), spanning Today/Yesterday/older dates.
- A moderator session and a regular (non-admin, non-moderator)
  session.
- An admin session to exercise Admin News (`020`) and Admin Content
  Pages (`021`) for User Story 3.

## Manual Scenarios

1. **Browse and day-grouping** — as a moderator, visit
   `/admin/audit-log`. Confirm entries group into Today/Yesterday/
   Earlier, each showing actor (or "System" for a null `actorId`),
   action, target, category badge, and time.

2. **Search + filters** — search free text matching an actor/action/
   target/reason; confirm it narrows correctly. Select an actor
   filter and a category filter together; confirm both apply in
   combination.

3. **Category badge accuracy** — confirm the badge shows exactly one
   of Moderation/Content/Access/System — never a more granular label
   not backed by the real `category` column.

4. **Access control** — attempt to visit this page as a regular
   (non-moderator) user; confirm access-denied. Confirm a moderator
   (not just an admin) CAN access it — deliberately less strict than
   Admin Settings (`024`).

5. **Empty state** — apply a filter combination matching nothing;
   confirm "No log entries match those filters" appears.

6. **Expand/collapse** — select an entry with a reason and meta rows;
   confirm it expands to show both; select it again to collapse.

7. **CSV export respects the filter** — apply a search/actor/category
   filter, then export; confirm the downloaded CSV contains only the
   matching rows, not the full table.

8. **Gap fix: Admin News now logs** — as an admin, publish a post via
   Admin News (`020`); confirm a new `content`-category entry appears
   in this log.

9. **Gap fix: Admin Content Pages now logs** — as an admin, edit
   (publish/unpublish) or create a page via Admin Content Pages
   (`021`); confirm a new `content`-category entry appears here too.

10. **No self-logging** — browse and filter this page repeatedly;
    confirm no new audit entries are created by the act of viewing.

## Automated tests

- Unit: `audit-log.ts` Zod schemas; `get-audit-log.ts`'s search/
  filter/day-grouping logic; `export-audit-log-csv.ts`'s filter-
  matching serialization.
- Integration: `020`'s amended `save-news-post.ts` and `021`'s amended
  `create-content-page.ts`/`toggle-page-status.ts`/
  `delete-content-page.ts` (each now calls `logAuditEntry()`); role-
  gate rejection for a non-moderator.
- E2E (`e2e/audit-log.spec.ts`): browse/search/filter/day-grouping,
  expand/collapse, CSV export filter-fidelity, access control, with
  an axe-core scan.
