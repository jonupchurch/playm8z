# Feature Specification: Game Typeahead & "Did You Mean?"

**Feature Branch**: `036-game-typeahead`

**Created**: 2026-07-17

**Status**: Draft

**Input**: Companion to 035 — reduce game-name fragmentation at the point of entry (Post a Game), so hosts land on a consistent spelling without being forced into a catalog.

## Context

Hosts type a game name freely on Post a Game (ADR 0001). That freedom
causes fragmentation — "D&D 5e", "DnD 5e", "dungeons and dragons" — which
splits Browse filters and Trending counts and means a curated image (035)
only reaches the exact spelling an admin listed.

035 catches fragmentation *after the fact* (admin aliases + AI-assist). This
feature catches it *at the source*, the cheapest place: nudge the host toward
a name that already exists as they type, while never blocking a brand-new
game. It is the third and gentlest of three escalating layers — typeahead
suggestion, then a "Did you mean?" nudge, then (035) admin/AI cleanup — each
reducing work for the next.

Crucially, this stays inside ADR 0001 / ADR 0011: suggestions never
*require* a match. A host can always type a game that isn't in the list, and
it posts exactly as today.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick an existing game as I type (Priority: P1)

A host starts typing a game name and sees existing game names that match,
and can pick one — landing on the canonical spelling without thinking about
it.

**Why this priority**: This is the feature's core and its main
fragmentation win — most hosts, offered the real name, take it.

**Independent Test**: Type a few letters of a known game; confirm matching
existing game names appear and picking one fills the field with that exact
name.

**Acceptance Scenarios**:

1. **Given** existing games "Valorant" and "Valheim", **When** a host types
   "val", **Then** both appear as suggestions.
2. **Given** a suggestion is shown, **When** the host selects it, **Then**
   the game field is set to that exact canonical name.
3. **Given** a host types a name that matches no existing game, **When** they
   keep typing, **Then** no suggestion is forced and they can submit the
   name as-is.

### User Story 2 - "Did you mean D&D 5e?" on a near miss (Priority: P2)

A host types a spelling very close to an existing game — "Valornt", "dnd
5e" — and is gently asked "Did you mean **Valorant**?", one click to accept.

**Why this priority**: Catches the misses the typeahead doesn't — someone
who types the whole thing their own way without picking a suggestion. Lower
than P1 because the typeahead handles the common case; this is the safety
net under it.

**Independent Test**: Type a deliberate near-miss of an existing game;
confirm a "Did you mean?" prompt naming the close game appears, and clicking
it replaces the field.

**Acceptance Scenarios**:

1. **Given** an existing game "Valorant", **When** a host types "Valornt"
   (a close misspelling) and it isn't an exact match, **Then** a "Did you
   mean Valorant?" prompt appears.
2. **Given** the prompt, **When** the host clicks it, **Then** the field is
   set to the exact existing name.
3. **Given** a host typed an *exact* existing name (any case/spacing),
   **When** the prompt logic runs, **Then** no "Did you mean?" is shown —
   there is nothing to correct.
4. **Given** a host typed something not close to any existing game, **When**
   they finish, **Then** no prompt is shown (no false nudges).

### Edge Cases

- **A typed name matches an existing game's alias** (035's aliases), not its
  canonical name. "Did you mean <canonical>?" should point at the canonical
  name the alias belongs to — the aliases are exactly the known variants.
- **No games exist yet** (empty catalog). The field behaves exactly as
  today: free text, existing top-6 suggestion chips, no typeahead, no
  prompt. The feature adds nothing intrusive to an empty system.
- **The host ignores every suggestion and prompt.** Their typed name is
  submitted verbatim — the feature never rewrites the field without a click.
- **Suggestions must not fight the keyboard.** Typing, arrowing, and
  submitting must stay smooth; the suggestion list must be dismissable and
  must not trap focus or hijack Enter destructively.
- **A near-miss that is ALSO a substring match.** Typeahead (substring) and
  "Did you mean?" (fuzzy) can both have something to say; they must not
  present contradictory or duplicated noise.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: As a host types in the game field, the system MUST offer
  matching **existing game names** (from the curated list 035 maintains) as
  selectable suggestions.
- **FR-002**: Selecting a suggestion MUST set the field to that exact
  canonical name.
- **FR-003**: The field MUST remain free text — a host MUST be able to submit
  a name that matches no suggestion, exactly as before. Suggestions never
  gate submission.
- **FR-004**: When the typed name is **close but not an exact match** to an
  existing game (including via that game's aliases), the system MUST show a
  single "Did you mean <name>?" prompt for the closest existing game, which
  sets the field to that name on click.
- **FR-005**: The "Did you mean?" prompt MUST NOT appear when the typed name
  already **exactly matches** an existing game or alias (normalised), and
  MUST NOT appear when nothing is sufficiently close (no false nudges).
- **FR-006**: All matching (typeahead and "did you mean?") MUST be
  **deterministic and local** — no AI, no per-keystroke server call. The
  set of existing names is provided once when the form loads.
- **FR-007**: Matching MUST use the same normalisation (case-insensitive,
  trimmed) the rest of the game system uses, so "exact match" here means the
  same thing it means to 035's resolver and Trending's grouping.
- **FR-008**: The feature MUST degrade to today's behaviour when there are no
  existing games — free text plus the existing popularity chips, nothing
  added.
- **FR-009**: The suggestion UI MUST be keyboard-accessible and dismissable,
  and MUST NOT change what gets submitted without an explicit selection.

### Key Entities

- **Existing game name** (from 035's `games`/`gameAliases`): the set of
  canonical names, plus aliases mapped to their canonical name, provided to
  the Post a Game form as the suggestion/"did you mean" source. Read-only
  here — this feature suggests from the list, never edits it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host typing part of an existing game's name is offered that
  game and can select it in one click.
- **SC-002**: A host typing a close misspelling of an existing game is shown
  a correct "Did you mean?" for it.
- **SC-003**: A host typing an exact existing name (any case) sees **no**
  "Did you mean?" — 0 false nudges on exact matches.
- **SC-004**: A host typing a genuinely new game is never blocked and never
  has their text rewritten without clicking — 100% free-entry preserved.
- **SC-005**: No keystroke triggers a network request or AI call — matching
  is entirely local.

## Assumptions

- **The suggestion source is 035's curated games + aliases**, fetched once
  when Post a Game loads and passed to the form. It's a small, bounded list.
- **"Close" is a deterministic string-distance judgement** (e.g. small edit
  distance / normalised similarity), tuned to catch real misspellings
  without firing on unrelated names. The exact threshold is an implementation
  detail; the requirement is "catches near-misses, not false positives".
- **The existing popularity-based suggestion chips stay.** This feature adds
  a typeahead + prompt driven by the *curated* list; the chips (most-open
  games) remain as a complementary quick-pick.
- **No change to how postings store `game`** — still free text (ADR 0001).
  This only influences what the host is *encouraged* to type.

## Out of Scope

- Making the game field a required picker / dropdown-only (that would reverse
  ADR 0001).
- Any AI in the entry path (035's AI-assist is admin-side and batch).
- Changing Browse, Trending, or how `game` is stored/grouped.
- Editing the games/aliases list from Post a Game (that's the admin screen,
  035).
- A typeahead anywhere other than Post a Game (e.g. Browse's game filter) —
  possible later, not here.
