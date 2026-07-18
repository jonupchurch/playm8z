# ADR 0014: An "owner" account marker and a scoped hard-delete exception to ADR 0005

**Status**: Accepted

**Date**: 2026-07-17

**Feature**: `041-owner-hard-delete-news`

## Context

[ADR 0005](0005-no-hard-deletes.md) established that nothing on this platform is
ever hard-deleted — content is only disabled or unpublished. In the news editor
that shows up as a red **"Delete"** button that actually sets `status='draft'`
(an unpublish), which is misleading: the label promises removal, the behavior
keeps the row.

The site operator wants two things: the button to say what it does, and a genuine
way for **themselves only** to permanently remove a news post. That requires a
notion of "the owner" distinct from ordinary moderators/admins, and a real hard
delete — which ADR 0005 otherwise forbids.

Two shapes were considered for "owner":

1. A new **role tier** above `admin` in `ROLE_RANK`. Problem: several surfaces
   check membership with an exact `role === "admin"` string
   (`nav-links.tsx`, `admin/news/page.tsx`, `pages/[slug]/page.tsx`), so an owner
   sitting *above* admin would be silently excluded by each — the Admin menu and
   editor capabilities would vanish for the owner unless every such check were
   widened.
2. A standalone **account marker** (`isOwner` flag), orthogonal to role, with the
   owner keeping their `admin` role.

## Decision

1. **Add an `isOwner` boolean marker** to accounts (`user.isOwner`, default
   `false`), separate from `role`. The owner keeps `role='admin'`; the flag only
   unlocks owner-only actions. This leaves the role hierarchy and every check
   against it untouched — no ripple. (Chosen with the operator over a role tier
   and over an env-based owner email.)

2. **Permit a narrow, owner-only hard delete as an explicit exception to ADR
   0005**, scoped to: **owner marker only**, **news posts only** (for now), and
   **always audit-logged**. Every other actor and content type remains under ADR
   0005's no-hard-delete rule with no change. The delete removes the `newsPosts`
   row (its likes/saves cascade) and writes a `logAuditEntry` that outlives the
   post (the audit `targetId` is a value, not an FK).

3. **Server-side owner gate** (Principle II): the permanent-delete Server Action
   re-reads `isOwner` from the DB and refuses a non-owner regardless of UI state;
   the hidden button is only UX. The action also requires an explicit in-UI
   confirmation before firing.

4. **Relabel** the existing soft-delete button "Delete" → **"Unpublish"**; its
   behavior (move to draft, keep the row and publish date) is unchanged.

5. The owner marker is **provisioned directly** on the account (an idempotent
   script), not through any admin UI, and does not appear in role/team management.

## Consequences

- The operator gets a real delete for news posts; everyone else, and every other
  content type, is still bound by ADR 0005.
- No role change ⇒ zero regression to existing admin/moderator access; the only
  new authorization surface is the flag + the one action.
- One additive column, no destructive migration. Hard deletes remain rare,
  audited, and owner-gated — the audit entry is the only trace of a deleted post
  (no restore, by design).
- ADR 0005 stays the default policy; this ADR narrows a single, documented hole in
  it rather than reversing it.

## Alternatives considered

- **Owner as a role tier above admin** — rejected: forces widening every exact
  `role === "admin"` check and extracting `ROLE_RANK` into a client-safe module;
  more moving parts and more regression surface than an orthogonal flag.
- **Owner via an env/config email** — rejected by the operator in favor of an
  account-level marker.
- **Make "Delete" actually hard-delete for all admins** — rejected: violates ADR
  0005 wholesale; the operator wanted removal restricted to themselves.
- **A trash/restore bin** — rejected: permanent is the point; the audit entry is
  the record.
