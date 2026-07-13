# 0006. Handle is the only identity shown to other users

**Status**: Accepted (2026-07-13)

## Context

Auth & Onboarding (`001`) collects a display name (`user.name`) at
onboarding Step 1 ("What should players call you?") — for a Google
sign-up this is auto-populated from the Google profile, which is
typically the person's real name. Home (`003`), the first feature to
actually render another user's identity to other users, showed this
`name` field directly on each listing card (host name + avatar). The
user flagged this as a privacy concern that applies platform-wide, not
just to Home's listing card.

## Decision

**`user.handle` is the only identity ever shown to *other* users,
anywhere in the product** — listing cards, forum threads/replies,
profile pages, admin views of user-generated content, anywhere one
user's identity is attached to something another user can see.
`user.name` (display name) still exists and is still collected during
onboarding, but it is used **only for self-facing UI** — greetings and
confirmations shown to the account owner themselves (e.g. onboarding's
"You're all set, Mara!" completion screen) — never rendered to anyone
else.

## Consequences

- Home (`003`, already merged): `get-open-postings.ts`'s `hostName`
  field and `listing-card.tsx`'s host display are amended to show
  `@handle` instead of the real/display name — bounded amendment to an
  already-merged feature, same pattern as every other cross-feature fix
  this project has made.
- Auth & Onboarding (`001`, already merged): **no code change** — it
  already only shows `name` on its own self-facing completion screen,
  which this decision doesn't touch. Collecting display name at
  onboarding remains in scope; the decision only narrows *where it can
  ever be rendered*.
- Every not-yet-implemented feature whose spec currently says "host
  name," "author name," "display name," or similar in a context visible
  to *other* users (Public Profile's heading, Forum's post author,
  Listing detail's host, Inbox's conversation list, Admin views of
  user content, etc.) needs to read `@handle` there instead when it's
  actually implemented — reconcile at implementation time, per this
  project's established "amend the earlier/adjacent docs when a later
  decision changes them" pattern, rather than rewriting all 23 remaining
  specs preemptively right now.
- Whoever implements Public Profile should give the page a clear
  `@handle`-first heading (no separate "display name" byline) —
  consistent with this ADR, not the wireframe's original two-line
  name/handle treatment.
