# Quickstart: Game Headline Images

## Try it locally

1. `npm run dev`. Sign in as a **moderator** (games are moderator-gated).
2. Home already shows Trending tiles — but now, even before you touch
   anything, two different games should render two **different** generated
   visuals, not the identical orange block. That alone is SC-001.
3. Go to the admin Games screen. Add a game whose name matches a game in an
   open posting (e.g. "D&D 5e"), upload an image.
4. Reload Home — that game's Trending tile now shows your image. Games without
   an image keep their generated visual.
5. Add an alias (e.g. "dnd 5e") for a variant spelling; a posting using that
   spelling now resolves to the same image.

Uploading needs `BLOB_READ_WRITE_TOKEN` (same as profile images / News). The
AI "suggest aliases" button needs `AI_GATEWAY_API_KEY`; without it, the
button reports "unavailable" and everything else still works by hand.

## Things that look wrong but aren't

- **Two spellings of one game are two Trending rows.** Correct — this feature
  attaches images, it does **not** merge Trending counts (FR-006). If both
  are aliased to the same game, both rows show the same image.
- **A game record exists but shows the generated visual.** Correct if it has
  no image yet, or is disabled. "Has a row" ≠ "has an image."
- **The admin Games screen isn't the Lists tab.** Right — Lists is for flat
  string arrays (genres). Games carry images and aliases, so they get their
  own screen.
- **`manage-game.ts` calls `del()` though "nothing is hard-deleted."** That
  frees an image *file*; the game *record* is only ever soft-disabled
  (`disabledAt`). Two different removes.

## The traps this feature is built around

- **Normalisation drift.** The resolver and Trending's grouping MUST normalise
  game names identically, or a variant shows an image in one place and not the
  other. There is one shared `normalize-game.ts`, and a test that both agree.
  If you touch either, check the other.
- **AI acting unreviewed.** "Suggest aliases" only *proposes* — it writes
  nothing. An alias exists only after a human accepts. If you find the suggest
  action writing an alias, that's the bug SC-007 exists to catch.
- **N+1 on Trending.** Resolve all trending games in one batched call, not one
  query per tile.

## Gotchas already known in this repo

- Schema: `npx drizzle-kit push`, then verify the three tables + unique
  indexes by querying the DB. Keep table names unambiguous — a rename-adjacent
  push hangs on an interactive prompt.
- Generated visual: pure hash of the name. `Math.random()` / `new Date()` are
  unavailable here and would break determinism anyway.
- The ADR 0001 relationship: read `docs/adr/0011-...` — this is the
  *permitted* alias layer, not a reversal. Don't "fix" the `games` table as if
  it contradicts 0001.
