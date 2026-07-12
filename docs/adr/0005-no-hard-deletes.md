# 0005. Never hard-delete — disable/soft-delete only

**Status**: Accepted (2026-07-12)

## Context

Profile's Account tab lists "deactivate" and "delete" as separate
danger-zone actions, but nothing specified what actually happens to a
user's data on delete — full removal (orphaning their forum replies,
posting history, roster records) or something softer. This is also the
same underlying question as the already-decided "blocking someone
mid-conversation hides and freezes the thread rather than deleting it"
and "a ban is permanent" (§ADR-adjacent decisions logged in `status.md`)
— both of those are instances of a broader principle worth stating once.

## Decision

**Nothing is ever hard-deleted.** Every removal-shaped action across the
platform — a user "deleting" their account, closing/removing a posting, a
forum thread/reply being taken down by moderation, a content page being
retired — is implemented as a disable/soft-delete: the record is retained
in storage and hidden from normal/public views, never destroyed. This
applies platform-wide, not just to `User`.

## Consequences

- Every user-generated-content table (`User`, `Posting`, `ForumThread`,
  `ForumReply`, `Message`, `ContentPage`, `NewsPost`, etc.) needs a
  consistent disable mechanism (e.g. a `disabledAt`/`deletedAt` timestamp
  or a `status` field including a disabled state) — a specific schema
  choice for whoever plans/implements each feature, not fixed here.
- All public/normal-view queries must consistently filter out disabled
  records; nothing should silently 404 due to a foreign key pointing at a
  hard-deleted row, since rows are never actually gone.
- Profile's "deactivate" and "delete" likely both resolve to the same
  underlying disable mechanism. Whether they stay two distinct user-facing
  options (e.g. differing in how easily the user themself can reverse it)
  or collapse into one is a smaller UX decision left to implementation
  time — not fixed by this ADR.
- This is a storage/complexity tradeoff accepted deliberately: retained
  data supports moderation review, audit, and data-integrity (no orphaned
  foreign keys), at the cost of needing disable-aware queries everywhere
  and data that never actually shrinks.
