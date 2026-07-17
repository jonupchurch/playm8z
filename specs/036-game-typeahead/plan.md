# Implementation Plan: Game Typeahead & "Did You Mean?"

**Branch**: `036-game-typeahead` | **Spec**: [spec.md](./spec.md)

## Summary

Enhance Post a Game's existing free-text game field with a typeahead over
035's curated game names and a deterministic "Did you mean?" nudge on a
near-miss. No schema changes, no AI, no per-keystroke server calls — the
curated name list is fetched once when the form loads and all matching is
local. Free entry is preserved absolutely (ADR 0001 / 0011).

## Technical Context

- **Runtime**: TypeScript, Next.js App Router (client component enhancement).
- **Data**: read-only from 035's `games` + `gameAliases`; no new tables.
- **Testing**: Vitest (the pure fuzzy-match + suggestion logic) + Playwright
  (the Post a Game interaction) + component tests for the field.

## Constitution Check

| Principle | Status |
|---|---|
| I — Spec-driven; ADR for tradeoffs | **Pass.** No new ADR: this is the "typeahead that only suggests" ADR 0011 already anticipated. No data model, so no data-model.md. |
| II — Validate at trust boundaries | **Pass / N.A.** This changes what a host is *encouraged* to type; the real trust boundary (the posting Zod schema, create-posting) is unchanged and still accepts free text. Suggestions are a UI affordance, not a new input path. |
| III — Tests prove behaviour | **Pass.** The matcher (typeahead filter + "closest within threshold, excluding exact") is pure and gets exhaustive unit tests — including the SC-003 "no nudge on exact match" and SC-004 "new game never blocked" properties. |
| IV — Scope discipline | **Pass.** Post a Game only. Not Browse's filter, not a required picker, not storage. All fenced in spec Out of Scope. |
| V/VI — No hard deletes / history | **N.A.** — read-only, no writes. |

## Approach

### Phase A — The matcher (pure, tested first)

`src/lib/games/match-game-name.ts`:
- `typeaheadMatches(query, names)` — names whose normalised form contains the
  normalised query; capped and ordered (prefix matches first).
- `didYouMean(query, entries)` — the closest existing game within a distance
  threshold, **excluding an exact normalised match** (name or alias), else
  null. `entries` carries `{ canonical, aliases }` so an alias near-miss
  resolves to its canonical name (spec Edge Cases).
- Distance is a small local edit-distance (Levenshtein) with a
  length-aware threshold, so short names don't over-trigger. All using
  `normalizeGame()` (FR-007), no AI (FR-006).

Unit-tested to the SC properties: substring typeahead; near-miss → correct
canonical; exact match → null; unrelated → null; alias near-miss → canonical.

### Phase B — The data

`getRatifiedGameNames()` (or extend the existing `/post` data load): return
enabled games' canonical names + their aliases, shaped for the matcher.
Passed into `PostGameForm` as a prop (the form is a client component; the
list is a plain serialisable array, no `@/db` import crosses into the
client — mirrors how `gameSuggestions`/`genres` already arrive).

### Phase C — The field

Enhance the game `<input>` in `post-game-form.tsx`:
- A typeahead dropdown (keyboard-navigable, dismissable) under the input,
  populated by `typeaheadMatches`; selecting sets the field.
- A "Did you mean <name>?" affordance driven by `didYouMean`, shown only
  when non-null; clicking sets the field.
- Keep the existing popularity chips (FR-008 / Assumptions).
- No forced rewrite; Enter still submits the form (guard the typeahead so it
  doesn't hijack submit destructively).

### Phase D — Tests & verify

Component tests for the field states; an e2e that types a near-miss on Post
a Game and accepts the "Did you mean?"; and typing a brand-new game and
submitting it unchanged. Full tsc/lint/vitest/e2e, cross-check e2e count.

## Risks

| Risk | Why | Mitigation |
|---|---|---|
| **"Did you mean?" fires on exact matches or unrelated names** (annoying / wrong). | A naive distance check nudges when it shouldn't. | Exclude exact normalised matches explicitly (FR-005); length-aware threshold; unit tests pin both "no nudge on exact" and "no nudge on unrelated". |
| **The typeahead hijacks Enter and breaks submit.** | Dropdowns often capture Enter. | Enter selects a highlighted suggestion only when the list is open AND one is highlighted; otherwise it submits. Tested. |
| **A client component pulling `@/db`.** | The documented crash. | The name list arrives as a prop (a plain array), like `genres`/`gameSuggestions` already do. |
| **Over-triggering on short queries.** | 2-char names match everything. | Typeahead needs a min query length; "did you mean" threshold scales with length. |

## Project Structure

```
specs/036-game-typeahead/  spec · plan · research · quickstart · checklists/
src/
├── lib/games/match-game-name.ts        # new — pure typeahead + did-you-mean
├── lib/games/get-ratified-games.ts     # new — enabled names + aliases for the form
├── app/post/page.tsx                   # +load ratified games, pass to form
└── components/post-game/post-game-form.tsx  # enhance the game input
```

No `data-model.md`: this feature adds no schema. It reads 035's tables.

## Complexity Tracking

None. The only subtlety is the "close but not exact, no false positives"
threshold, which is contained in one pure, exhaustively-tested function.
