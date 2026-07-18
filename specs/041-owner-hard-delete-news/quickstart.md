# Quickstart: validating owner-only permanent delete

Prereqs: local dev server; the owner account (`jonupchurch@gmail.com`) provisioned
with `isOwner=true` locally (`scripts/set-owner.ts`); a second admin account with
`isOwner=false`; at least one existing news post.

## US2 — relabel (any editor)

1. As any moderator/admin, open an existing post in `/admin/news`.
2. The red soft-remove button reads **"Unpublish"** (not "Delete").
3. Click it → the post becomes a **draft**: gone from `/news`, still present in the
   admin list under drafts, original publish date intact, and re-publishable.

## US1 — owner permanent delete

1. As the **owner**, open an existing post in `/admin/news`.
2. A **"Delete permanently"** control is visible (it is NOT visible to the
   non-owner admin, and NOT visible for an unsaved/new post).
3. Click it → an inline confirm appears; click **Cancel** → nothing happens.
4. Click **Delete permanently** again → **Confirm** → the post is removed:
   - gone from `/news`,
   - gone from the `/admin/news` list,
   - its likes/saves gone (no orphans),
   - the moderator audit log shows a "permanently deleted a news post" entry that
     remains readable afterward.
5. As the **non-owner admin**, confirm the control is absent, and that a direct
   invocation of the action is refused (returns an authorization error, deletes
   nothing).

## Automated

- `npm test` — `require-owner` (owner true / non-owner false), `delete-news-post`
  (owner deletes + cascade + audit; non-owner refused; missing post graceful), and
  the news editor (relabel; owner-only button; two-step confirm).
- `npm run typecheck` / `npm run lint` green.
