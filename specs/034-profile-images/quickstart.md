# Quickstart: Profile Images

## Try it locally

Needs `BLOB_READ_WRITE_TOKEN` in `.env.local` to actually store a file
(same as News covers). Without it, uploads fail with a clear error — the
Blob client has no console-log fallback the way email does.

1. `npm run dev`
2. Sign in, go to account settings, upload a photo.
3. It should appear immediately in the settings page, and — the real test —
   on your **listings and forum posts too**, because every avatar shares one
   component. If it only changed in settings, a surface was missed.
4. Replace it, then remove it. Removing should fall back to your Google photo
   (if you signed in with Google) or the gradient block (if credentials).

## Things that look wrong but aren't

- **A Google user already has a photo before uploading anything.** Correct —
  we already stored it at sign-in and never showed it until now (FR-005).
- **Removing an uploaded photo doesn't go to the gradient block for a Google
  user.** Also correct — it falls back to the Google photo first; the
  gradient block is only for users with neither.
- **`update-avatar.ts` calls `del()` even though "nothing is ever
  hard-deleted."** That rule is about database *records*; `del()` frees a
  storage *file* when you replace/remove a photo. The user row is untouched.

## The two traps this feature is built to avoid

- **A surface still showing the gradient block.** There are ~30 avatar render
  sites. The whole point of the shared `<Avatar>` is that a photo set once
  shows everywhere. When testing, always check a surface *other* than where
  you set it.
- **A Google sign-in wiping an uploaded avatar.** Uploads live in a new
  `avatarImage` column, never in `users.image` (which Google owns and
  rewrites). If you find yourself writing to `users.image`, stop.

## Gotchas already known in this repo

- Photos over ~1MB: the app-wide `bodySizeLimit: 6mb` (commit e662e2f) is
  what makes real photos work through a Server Action. It's already set;
  don't assume the 5MB limit works without it.
- Schema: `npx drizzle-kit push`, then verify the column by querying the DB.
  Production applies schema itself via `vercel-build`.
- Migrating avatar sites: read each file. The `bg-surface text-text-dim`
  boxes in admin drawers are icons, not avatars — a blind find/replace breaks
  them.
