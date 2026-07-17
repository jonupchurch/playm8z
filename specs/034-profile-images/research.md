# Phase 0 Research: Profile Images

Everything below was read out of the code, not recalled. Where a number
appears (29 files, a column name), it was grepped this session.

## 1. Storage: reuse the Blob seam, add a `put`/`del` pair for avatars

**Decision**: reuse Vercel Blob exactly as News covers (029, ADR 0008) do —
`put(path, file, {access:'public', addRandomSuffix:true})` — under an
`avatars/` prefix. Add `del()` on replace/remove (News covers never deleted;
avatars must, FR-012).

**Rationale**: the seam, the env var (`BLOB_READ_WRITE_TOKEN`), and the
platform gotcha are all already handled. The one gotcha worth restating
because it is invisible until a real photo is used: Next.js Server Actions
silently cap the request body at **1MB**, far under the 5MB this feature
advertises, so any real phone photo hung until
`experimental.serverActions.bodySizeLimit` was raised to `6mb` (commit
e662e2f). That config is app-wide and already in place — this feature
inherits it and must not assume the 5MB limit works without it.

**New vs 029**: `uploadNewsCoverImage` only ever creates a blob. Avatars
need cleanup (FR-012), so the avatar action must `del()` the prior blob
after a successful replace/remove. `del()` a URL that's already gone is a
no-op, so ordering (write new → point user at it → delete old) is safe even
if the delete fails.

## 2. The column question (FR-006) — a NEW column, don't overwrite `users.image`

**Decision**: add `users.avatarImage` (text, nullable) for the uploaded
photo. Leave `users.image` alone as the Google photo.

**Rationale**: `users.image` is populated by Google sign-in
(`auth.ts:81`, `image: profile.picture`) and, more importantly, is **owned
by the Auth.js adapter** — the adapter reads/writes it during sign-in. If
the upload overwrote `users.image`:

- removing the upload would have nothing to fall back to (FR-006 violated —
  the Google photo is gone), and
- the next Google sign-in could re-populate `users.image` and silently
  clobber the user's uploaded avatar, because the adapter doesn't know we
  repurposed the column.

A separate column sidesteps both. Precedence (FR-005) becomes a pure
read-time expression: `avatarImage ?? image ?? gradient(avatarColor)`.

**Alternative considered**: a single `image` column plus a boolean "is this
a user upload." Rejected — it still lets a Google sign-in overwrite the
upload, and it can't hold both values to fall back between.

## 3. The shared component (FR-008) — the actual work, and its real size

**Grepped: 29 files** reference `avatarGradient` / `AVATAR_COLORS.find`.
That is the migration surface, and it's the bulk of the feature.

**Decision**: one `Avatar` component taking `{ imageUrl, googleImageUrl,
avatarColor, handle, size }` (or a resolved `src` + fallback data), rendering
the FR-005 precedence, with `size` covering the observed range.

**Sizes and shapes are NOT uniform** — grepped examples: `h-23 w-23
rounded-[24px]` (profile header), `h-10 w-10 rounded-xl` (listing card),
`h-9 w-9 rounded-[11px]` (user table, block modal), `h-8 w-8` (several).
So the component needs a **size prop** (a small named scale: `sm`/`md`/`lg`
mapping to the existing sizes) and to keep each call site's corner radius,
or standardise radius per size. The plan must enumerate the real sizes so no
call site visually regresses.

**Not every gradient box is a user avatar.** Several `h-8 w-8 ... bg-surface
text-text-dim` boxes in admin drawers are icon placeholders, not
handle-initial avatars. The migration targets specifically the
**gradient-background + handle-initial + `text-on-accent`** pattern. The
plan's file list must be built by reading each of the 29, not by blind
find/replace — this is exactly the kind of over-broad sweep that breaks an
unrelated element.

**Broken-image fallback (FR-007)** is a client concern: an `<img onError>`
that swaps to the gradient block. So the component is a client component, or
has a small client wrapper for the image-with-fallback, even though most of
its call sites are server-rendered. The plan should confirm this doesn't
force a wave of `"use client"` up the tree (a client leaf inside a server
parent is fine; the danger flagged in memory is a client component importing
a *runtime value* from a `@/db`-touching module — the Avatar imports no such
thing).

## 4. Rendering an external (Google) image — Next.js `<Image>` vs `<img>`

**Decision**: plain `<img>` with `onError` fallback, not `next/image`.

**Rationale**: `next/image` requires every external host to be allowlisted
in `remotePatterns`. Google's photo URLs (`lh3.googleusercontent.com`) plus
Blob's host would both need configuring, and `next/image` optimisation of a
tiny always-square avatar buys little. A plain `<img>` with `object-cover`
and a fixed frame (FR-009) sidesteps host config and gives the `onError`
fallback FR-007 needs. Blob and Google both serve already-reasonable sizes.

**Verify during implementation**: whether the repo already sets
`images.remotePatterns` for the News Blob covers — if `next/image` is
already used for those, matching that choice may be cleaner. News covers
render via plain `<img>` last time I looked; confirm before diverging.

## 5. Upload UX — clone the News editor's client pattern

`news-post-editor.tsx` is the reference: a hidden `<input type="file"
accept="image/jpeg,image/png,image/webp">`, an `onChange` that builds
`FormData`, calls the Server Action inside a `try/catch` (the catch matters —
029's own bug was a missing catch letting a thrown action crash the editor),
and shows a pending/error state. The avatar uploader in account settings
mirrors this. Account settings already has a Server-Action form
(`account-forms.tsx`, 007), so the pattern and the `requireAuth()` gate are
both established.

## 6. Trust boundary (FR-013) — server validates, same as 029

`requireAuth()` (own-account write, not `requireVerifiedEmail()`), then the
same type/size checks 029 runs server-side. No new moderation surface
(FR-014) — avatars are trusted like bios. Worth stating in an ADR-lite note
in the plan, not a full ADR: it's a conscious UGC-trust decision but not an
architecture-shaping one.

## 7. What could break elsewhere

- **Onboarding** writes `avatarColor` and reads `users.image` in
  `api/onboarding/route.ts:23`. Adding `avatarImage` doesn't touch that path,
  but the migration must not disturb the onboarding avatarColor step.
- **The Auth.js `session`/`jwt`** currently carries `user.image`. If any
  session-shape code assumes `session.user.image` is "the avatar," it now
  means "the Google photo only" — check `auth.ts` callbacks and
  `SiteHeader`'s own avatar (top-right) so it uses the shared component too,
  or it'll show the Google photo while everything else shows the upload.
- **Tests**: ~10+ component tests render avatars. Introducing a shared
  component changes their DOM; expect to update queries. The listing-card
  test (`listing-card.test.tsx`) is the known one.
