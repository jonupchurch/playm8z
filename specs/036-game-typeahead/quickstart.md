# Quickstart: Game Typeahead & "Did You Mean?"

## Try it locally

1. Seed some games via `/admin/games` (035) — e.g. add "Valorant", "D&D 5e".
2. Go to `/post`. In the Game field:
   - Type "val" → "Valorant" appears as a typeahead suggestion; click it.
   - Type "Valornt" → a "Did you mean **Valorant**?" line appears; click it
     to correct.
   - Type "Chess" (not seeded) → no suggestion, no nudge; publish it and it
     posts as "Chess" (free entry is never blocked).

## Things that are working as intended

- **No suggestions when the catalog is empty.** With no games seeded, the
  field is exactly today's free-text input plus the popularity chips.
- **No "Did you mean?" on an exact match.** If you typed or picked the real
  name (any case), there's nothing to correct.
- **Nothing is rewritten without a click.** The feature suggests; you decide.
  Submit whatever you typed.

## The traps this is built around

- **False nudges.** "Did you mean?" must not fire on exact matches or on
  unrelated names. The threshold is length-aware and exact matches are
  excluded — pinned by unit tests, not vibes.
- **Enter breaking submit.** A typeahead that eats Enter is worse than no
  typeahead. Enter only picks a suggestion when the dropdown is open with a
  highlight; otherwise it submits the form.
- **No per-keystroke server calls.** The name list is fetched once at load
  and matched locally. If you see a network request on keypress, that's the
  bug.
