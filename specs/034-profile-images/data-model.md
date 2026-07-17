# Phase 1 Data Model: Profile Images

One new column. No new table. Read out of the current `src/db/schema.ts`,
not proposed from memory.

## Changed table: `users`

```
avatarImage   text   NULL     -- new: the user's UPLOADED avatar (a Blob URL)
```

That's the whole schema change. Everything else is read-time precedence over
columns that already exist.

**Why a new column and not `users.image`** — research.md #2, in short:
`users.image` holds the Google photo and is owned by the Auth.js adapter,
which rewrites it on sign-in. Overwriting it would (a) leave nothing to fall
back to when an upload is removed (FR-006) and (b) let the next Google
sign-in clobber the upload. Separate column, no collision.

## The three columns that decide an avatar

| Column | Meaning | Written by |
|---|---|---|
| `avatarImage` (new) | User's uploaded photo | This feature's upload/remove action |
| `image` (existing) | Google profile photo | Auth.js adapter / Google sign-in (`auth.ts:81`) — **not touched by this feature** |
| `avatarColor` (existing) | Gradient-block colour id | Onboarding (007) — **not touched** |

**Precedence (FR-005), as a pure read-time rule:**

```
avatarImage  ??  image  ??  gradientBlock(avatarColor, handle-initial)
```

No column stores "which one is active" — active is computed, never
persisted. This is the same principle the codebase already uses for
"flagged" users and the auto-hide rule: derive, don't store a
denormalised flag that can drift.

## Lifecycle of `avatarImage` (FR-010/011/012)

- **Set / replace**: upload new blob → set `avatarImage` to its URL →
  `del()` the *previous* blob URL if there was one. Order matters: point the
  user at the new file before deleting the old, so a failed delete leaves an
  orphan (harmless, cleanable) rather than a dangling reference.
- **Remove**: `del()` the blob → set `avatarImage = NULL`. The avatar then
  falls through to `image` (Google) or the gradient block.
- **Never** touches `image` or `avatarColor`. Removing an upload is not a
  "delete" of anything else.

**On ADR 0005 (no hard deletes):** that rule governs **database records** —
users, postings, content pages are disabled, never deleted. `avatarImage`
holds a **storage URL**, and `del()` removes the *file*, not a record. The
row (the user) is untouched; only the column value changes to NULL and one
storage object is freed. This is deletion of a file, not of a record, and is
outside ADR 0005's scope. Stated here because "del()" near "no hard deletes"
will otherwise look like a contradiction to the next reader.

## Not changed, and deliberately

- **`users.image`** — still the Google photo, still adapter-owned. The
  feature reads it (precedence) and never writes it.
- **`users.avatarColor`** — unchanged; still the final fallback for anyone
  who never uploads and never used Google.
- **No `avatars` table, no per-user image history.** One current upload per
  user (FR-012 / SC-005). Prior uploads are deleted, not archived — there is
  nothing to model.

## Migration note

`avatarImage` is nullable with no default, so every existing row is `NULL`
on deploy — i.e. "no upload," which is correct: existing users keep showing
their Google photo (now surfaced) or their gradient block. No backfill.
Applied via `drizzle-kit push` (not `db:migrate`, which no-ops here); verify
the column landed by querying the DB, not by the command's exit code.
