# Tasks: Game Typeahead & "Did You Mean?"

**Feature**: `036-game-typeahead` | **Plan**: [plan.md](./plan.md)

## Phase A — The matcher (pure, tested first)

- [ ] **T001** `src/lib/games/match-game-name.ts`:
      - `typeaheadMatches(query, names, limit?)` — normalised-substring
        matches, prefix matches first, capped, min query length respected.
      - `didYouMean(query, entries)` where `entries: {canonical, aliases[]}[]`
        — the closest game within a length-aware Levenshtein threshold,
        **excluding an exact normalised match** on name or alias; returns the
        `canonical` or null. Uses `normalizeGame` (FR-007). No AI (FR-006).
- [ ] **T002** [P] Unit tests for T001, pinning the SC properties:
      - "val" → both "Valorant" and "Valheim" (typeahead)
      - "Valornt" → didYouMean "Valorant" (near-miss)
      - exact "valorant"/" VALORANT " → didYouMean **null** (SC-003)
      - an alias-exact ("dnd 5e") → didYouMean the canonical (definite)
      - an alias near-miss → canonical
      - unrelated ("Chess") with no close game → null (no false nudge)
      - a short query ("cs") does NOT over-nudge between "CS2"/"CS"
      - empty catalog → no matches, no nudge (FR-008)

## Phase B — Data

- [ ] **T003** `src/lib/games/get-ratified-games.ts`:
      `getRatifiedGames()` → `{ canonical, aliases[] }[]` for enabled games
      (join `games` + `gameAliases`, `disabledAt IS NULL`). Small bounded read.
- [ ] **T004** `/post` page: call it, pass `ratifiedGames` to `PostGameForm`
      alongside the existing `gameSuggestions`/`genres`.

## Phase C — The field

- [ ] **T005** `post-game-form.tsx`: accept `ratifiedGames` prop; add a
      keyboard-navigable, dismissable typeahead dropdown under the game input
      (from `typeaheadMatches`); selecting sets the field to the canonical
      name. Enter selects a highlight only when the list is open+highlighted,
      else submits (research.md #5). Escape closes.
- [ ] **T006** Add the "Did you mean <name>?" line driven by `didYouMean`,
      shown only when non-null; clicking sets the field. Keep the existing
      popularity chips (FR-008).
- [ ] **T007** [P] Component tests: typeahead shows/filters/selects; Enter
      submits when the dropdown is closed; "Did you mean?" appears on a
      near-miss and is absent on an exact match and on a new game.

## Phase D — E2E & verify

- [ ] **T008** E2E on Post a Game: type a near-miss of a seeded game →
      accept "Did you mean?" → field becomes the canonical name → publish →
      the posting has the canonical game. Plus: type a brand-new game →
      publish → it posts verbatim (SC-004, free entry preserved).
- [ ] **T009** Full verify: tsc, lint, Vitest, Playwright (cross-check the
      e2e count vs `--list`); then merge, push, confirm CI + prod.
