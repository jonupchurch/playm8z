# ADR 0011: A lightweight game-image + alias layer over free-text games

**Status**: Accepted

**Date**: 2026-07-17

**Feature**: `035-game-images`

**Relationship to ADR 0001**: amends by extension; does **not** reverse.

## Context

Games render as a flat identical orange block on Home's "Trending Now" cards
(and wherever a game is shown). Trending is **game-keyed** — computed by
grouping open postings on their free-text `game` name — so an image attached
to a single *posting* cannot fill a card that may represent several postings.
The image has to attach to the game **name**.

Attaching admin-managed images to game names looks, at a glance, like the
curated Game catalog that **ADR 0001 deliberately rejected** (free-text
`game`, no catalog, no admin Games page, to avoid maintenance and the
"Other" fragmentation trap).

But ADR 0001 anticipated this and left the door open. Its final consequence:

> "If fragmentation becomes a real problem later, normalization (e.g.
> fuzzy-matching or a lightweight alias table) is a smaller, reversible fix
> to layer on top — not a reason to revisit this decision now."

## Decision

Add a **lightweight, optional layer** over free-text games — the alias table
ADR 0001 named — for the purpose of *attaching images*, not building a
catalog:

- New `games` (name + normalised name + optional image + soft-disable) and
  `gameAliases` (normalised variant → game) tables.
- Image resolution at read time: a posting's free-text game name is
  normalised and looked up against game names + aliases; a match with an
  image yields that image, otherwise a **deterministic generated visual**
  derived from the name.

**What makes this a softening of ADR 0001, not a reversal — the load-bearing
distinctions:**

1. **`postings.game` stays free text.** No foreign key. Postings never
   reference or join to `games`. A game name that isn't in `games` still
   posts, still trends, still works — it just gets the generated visual.
2. **Post-a-Game is unchanged.** No picker, no required selection. (A
   *suggesting* typeahead is separate feature 036, and it too only suggests —
   never requires.)
3. **The catalog is optional and additive.** It exists to attach images and
   catch spelling variants, not to define the set of valid games. Removing
   the whole layer would lose images and revert to the orange block — it
   would not break posting, browsing, or trending.
4. **Trending's grouping and counting are untouched.** Aliases affect *image
   lookup only*, never how Trending counts or groups (that would change ADR
   0001's behaviour and is explicitly out of scope).

So the maintenance burden ADR 0001 feared is bounded and opt-in: unattended,
the system degrades to distinct generated visuals, which is already better
than the identical orange block it replaces. Curation is upside, not a gate.

## Consequences

- ADR 0001 remains in force for what it actually decided: `game` is free
  text, postings don't reference a catalog, there's no per-game hub page.
  This ADR adds an image/alias *lookup* layer beside it, and a pointer is
  added into ADR 0001 so the next reader of "no catalog" finds this
  amendment rather than treating 035 as a contradiction to fix.
- **Normalisation must be shared.** Image lookup and Trending grouping must
  normalise game names identically (`lower(trim)` at minimum) or they
  disagree about game identity. This is a standing constraint, not a
  one-time task.
- **The alias namespace is cross-checked.** An alias maps to exactly one
  game and cannot collide with a game's own name — enforced by unique
  indexes plus an application check across the two tables.
- **A door is opened that a future feature could push on.** If someone later
  wants Trending to *merge* counts across aliased spellings, or a real
  per-game hub page, this layer is the foundation — but each is its own
  decision with its own ADR, not implied by this one.

## Alternatives considered

- **Per-posting uploaded images** (the user's first instinct): can't fill a
  game-keyed card, and multiplies moderation surface. Rejected in design.
- **A full catalog with `game` as a foreign key** (Post-a-Game becomes a
  picker): the actual reversal of ADR 0001 — changes posting and browse
  flows and gates new games behind admin data entry. Rejected; the whole
  point is to keep postings free.
- **Generated visuals only, no admin images**: fixes the "identical orange"
  complaint but gives the team no way to make hero games look good. Kept as
  the *fallback*, not the whole feature.
