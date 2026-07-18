# ADR 0019: Moderation roles are a closed, ranked set; entitlements are orthogonal markers

**Status**: Accepted

**Date**: 2026-07-18

**Feature**: n/a (architectural guardrail; generalizes [ADR 0014](0014-owner-marker-and-scoped-hard-delete.md))

## Context

The role vocabulary is defined in three independent places that must be kept in lockstep by hand:

- `ROLE_RANK` (`src/lib/auth/require-role.ts`) — `{ user:0, support:1, viewer:1, moderator:2, admin:3 }`, the
  ranking authorization compares against.
- `assignableRoleSchema` (`src/lib/validations/admin-settings.ts`) — the Zod enum for the admin role picker.
- `ASSIGNABLE_ROLES` (`src/lib/admin/get-team.ts`) — the list rendered in the admin UI.

A tech-debt sweep flagged the drift risk: adding/renaming/removing a tier means editing all three, and nothing
enforces they agree (a role assignable via the enum but missing from `ROLE_RANK` would silently fail the rank
comparison rather than raise a type error). But this only bites *if the role set changes* — today the three are
in sync and there is no live bug.

The question is therefore not "how do we de-duplicate" but "does the role set ever change?" The two concepts we
might reach for as "new roles" are site **ownership** (already shipped as `isOwner`, ADR 0014) and a future
**Premium** tier — and neither is a moderation authority level. `admin`/`moderator` are about *who can moderate
whom* (an inherently ordered hierarchy); ownership and premium are *entitlements*, orthogonal to that authority (a
premium player can be a plain user or a moderator; the owner keeps `role='admin'`).

## Decision

1. **The moderation role set is closed and ranked.** `user < support/viewer < moderator < admin`, defined by
   `ROLE_RANK`. New moderation tiers are not anticipated. Adding one is a deliberate, rare change that touches all
   three role definitions at once (and, if it ever happens, is the moment to derive the enum/array from `ROLE_RANK`
   — not before).

2. **Entitlements and markers are orthogonal columns on `users`, never new role tiers.** Site ownership
   (`isOwner`, ADR 0014) is the first instance. A future Premium tier is modeled the same way — e.g.
   `role='user'` + an `isPremium`/`premiumTier` column — never as an entry in `ROLE_RANK`. This keeps entitlements
   independent of moderation authority and keeps the ranked role set frozen, so no existing `role === "admin"` or
   rank comparison is perturbed.

3. **The existing three-way role vocabulary is accepted as-is (YAGNI).** Because the role set is intentionally
   frozen, the triplication is a documented non-issue, not latent debt to pay down now. The self-enforcing
   "derive from one source" refactor is deferred to *if and when* a real moderation tier is added.

## Consequences

- Clear rule for the next "should this be a role?" question: **moderation authority → a ranked role; anything
  else (entitlement, subscription, marker) → an orthogonal column.**
- The role-vocabulary duplication (backlog item #3) is closed by decision rather than by code — it can't drift
  because we've decided the set won't change.
- Owner and (future) Premium share one pattern, consistent with ADR 0014, avoiding the role-hierarchy ripple that
  motivated the owner flag in the first place.

## Alternatives considered

- **Derive `assignableRoleSchema`/`ASSIGNABLE_ROLES` from `ROLE_RANK` now** — rejected under YAGNI: it guards a
  change (adding a tier) we've decided not to make; revisit at that point if it ever comes.
- **Model owner/premium as role tiers** — rejected: they aren't moderation authority levels; adding them to the
  rank would perturb every `role === "admin"` and rank check (exactly what ADR 0014's orthogonal flag avoided).
