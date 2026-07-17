# Phase 0 Research: Game Typeahead & "Did You Mean?"

## 1. Reuse `normalizeGame`, and match 035's notion of "same game"

The matcher must use `src/lib/games/normalize-game.ts` (lower+trim) so
"exact match" means the same thing here as to 035's resolver. Otherwise the
typeahead could call something an exact match that 035 treats as a variant,
or vice versa — confusing and inconsistent.

## 2. Distance metric — small local Levenshtein, length-aware threshold

**Decision**: Levenshtein edit distance with a threshold that scales with
the shorter name's length (roughly: allow ~1 edit per 4-5 chars, min 1, cap
~3). Pure, tiny, deterministic, no dependency.

**Rationale**: catches real typos ("Valornt"→"Valorant", 1 edit) and casing/
spacing variants (0 edits after normalise) without firing on genuinely
different short names ("CS2" vs "CS" would be distance 1 but both are ~3
chars — the threshold must NOT nudge there, so short strings get threshold
0-1 and we also require the match not be a *prefix* of an unrelated
expansion). The tests are where this is actually tuned; the doc states the
property (catch typos, not false positives), the tests enforce it.

**Alternatives**: trigram/Jaccard similarity (heavier, similar result);
a fuzzy library (a dependency for ~20 lines of code — no). AI (explicitly
out — FR-006; the AI lives in 035's admin batch path only).

## 3. Aliases are the known-variants gold mine

035's `gameAliases` are exactly the misspellings a human already confirmed
map to a canonical game. So an incoming name that **exactly** matches an
alias is a *definite* "did you mean canonical?" (higher confidence than a
fuzzy guess), and a name *close* to an alias resolves to that alias's
canonical too. Feed `{ canonical, aliases[] }` per game into the matcher so
both name- and alias-distance are considered, always resolving to canonical.

## 4. Data source — one bounded read at form load, passed as a prop

`getRatifiedGames()` returns enabled games' canonical names + aliases. The
`/post` page already loads `gameSuggestions` and `genres` and passes them to
the client `PostGameForm`; this adds one more plain-array prop the same way.
No `@/db` import crosses into the client component (the documented crash),
because the data is fetched in the server page and handed down.

The list is small (a curated catalog), so fetching all of it once per form
load is fine — no per-keystroke server call (FR-006), no pagination.

## 5. Keyboard/submit interaction is the real UI risk

A typeahead under a form input classically breaks Enter-to-submit. The rule:
Enter selects the highlighted suggestion only while the dropdown is open
with a highlight; otherwise Enter submits the form as today. Escape closes
the dropdown. This is standard combobox behaviour and is the thing most
worth an explicit component test.

## 6. Don't double-nudge

Typeahead (substring) and "did you mean" (fuzzy) can both have output for one
query. Keep them distinct in the UI: the dropdown is the live typeahead; the
"Did you mean?" is a single line shown only when the *current* value isn't
an exact match but is close. When the value exactly matches (the user picked
a suggestion or typed it exactly), the "did you mean" is silent (FR-005).
