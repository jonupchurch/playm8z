# Phase 0 Research: Game Headline Images

Grounded in code read this session, not recall.

## 1. The resolver is the spine; everything else feeds or consumes it

**Decision**: one server-side function `resolveGameImage(gameName) →
{ kind: 'admin', url } | { kind: 'generated', ... }`, and a batched
`resolveGameImages(names[])` for surfaces that show several (Trending shows
up to 5). Normalise the input, look it up against game names + aliases, return
the admin image or a generated visual.

**Rationale**: FR-001/004 want one deterministic, AI-free lookup shared by
every surface. Trending flows `page.tsx → getTrending() → LiveFeed →
TrendingRow`; the resolve step slots in at the page (server) so the component
receives already-resolved images and stays a dumb renderer. Batching matters
because a per-name query inside a `.map()` in a server component is an N+1.

## 2. Data model — two tables, both new (data-model.md has the columns)

`games` (canonical name + normalised name + image url + disabled flag) and
`gameAliases` (normalised variant → gameId). **Not** the `settings` singleton
— that holds flat string arrays (genres, suggested games via the Lists chip
editor); games carry an image and own aliases, so they need real rows. This
is the "lightweight alias table" ADR 0001 pre-authorised, and the reason it
is NOT the catalog ADR 0001 rejected: nothing references it by FK, postings
never join to it, `postings.game` stays free text.

**The hard constraint is FR-015** — an alias maps to exactly one game AND
must not collide with any game's own name. Alias-vs-alias is a unique index
on `gameAliases.normalizedAlias`. Alias-vs-name and name-vs-alias collisions
cross tables, so a DB unique index can't cover them alone; an
application-level check at write time is required (research this project's
own precedent: the handle-uniqueness check does exactly this pattern —
pre-check plus the unique index as the race backstop). State both.

## 3. Normalisation must MATCH how Trending already groups

`get-trending.ts` groups by `postings.game` — its ADR 0001 note says
"case-insensitive, trimmed." **The resolver's normalise() MUST equal
Trending's grouping normalisation**, or the two disagree on what "the same
game" is: Trending would show two rows the resolver treats as one, or vice
versa. So normalise() is `lower(trim(game))` as a shared helper, and if
Trending's grouping is currently inline SQL `lower(trim(...))`, the plan must
either share the helper or document that both sides use the identical rule.
Verify the exact current grouping expression before writing the resolver —
don't assume it's already `lower(trim)`; the ADR *says* so but the code is
the authority (a research.md claim being wrong about the code has bitten this
project before).

## 4. The generated visual — deterministic hash → gradient

**Decision**: derive a stable hash from the normalised game name, map it to a
hue (and a second accent hue / angle) to produce a per-name gradient, plus
the game's initial(s). Pure function, no storage, no randomness.

**Rationale**: FR-002 needs same-name→same-visual and different-name→different
-visual, deterministically. A hash→hue is the standard, cheapest way; it
needs no table and no backfill (assumptions). **`Math.random()` is banned**
in this environment and would break determinism anyway — the hash is the only
correct source of variation. Unit-test determinism directly (same input twice
→ identical output; two different names → different hues).

Keep it inside the palette family (the site's warm accents ± hue rotation) so
it reads as brand, not noise. This is a design detail for the plan; the
requirement is only determinism + distinctness.

## 5. Image upload & lifecycle — the 034/029 pattern again

Reuse the Blob seam: `put()` under `game-images/`, server-validate type/size
(same constraints as 029/034), `del()` the prior blob on replace/remove
(FR-011). Admin action gated by `requireRole("moderator")` — content curation,
matching the News *editor* gate (029). Note: `generate-news-draft.ts` uses
`requireRole("admin")` for the AI action specifically; the plan should decide
whether the games AI-suggest matches that stricter gate or the moderator gate
of the surrounding screen. Recommend moderator for the whole screen for
coherence, and record the choice.

Removing a *game* soft-disables the record (FR-013, ADR 0005) — a
`disabledAt` timestamp, the same soft-delete shape `users.deactivatedAt` /
`postings.removedAt` already use. Removing an *image* is a column-to-null +
blob `del()`. Two different "removes"; don't conflate them.

## 6. AI-assisted alias suggestions — reuse `generateStructuredDraft`

`src/lib/ai/gateway.ts` `generateStructuredDraft(schema, system, prompt)`
returns schema-validated structured output via the AI Gateway (Claude Haiku,
ADR 0007). Perfect fit:

- **Input**: the distinct *unmatched* normalised game strings from postings
  (those that resolve to no game/alias today) + the list of game canonical
  names.
- **Prompt**: "map each unmatched string to one of these games, or 'none'."
- **Output schema**: `{ suggestions: [{ rawName, gameId|null, confidence }] }`,
  Zod-validated at our boundary (the gateway helper already re-parses —
  Principle II).
- **Never auto-applied** (FR-018): the action returns proposals; a separate
  accept action writes the alias, running the same FR-015 checks as a manual
  add. A reject writes nothing.

**"Need not reappear indefinitely"** (US4 scenario 3): a small
`gameAliasDismissals` table of normalised strings the admin said "leave as
is" keeps rejected proposals from nagging on the next run. Lightweight;
included rather than hand-waved.

**FR-020 (no provider)**: `gateway.ts` throws if `AI_GATEWAY_API_KEY` is
unset — the suggest action must catch and return "AI unavailable," leaving
manual management fully working. 028's own tests mock the `ai` package, so
unit tests need no key.

## 7. Read-path wiring — Trending is the must, cards are the maybe

`trending-row.tsx:29` is the orange `<div>`. Replace with the resolved
image/generated visual. `page.tsx` resolves the ≤5 trending games server-side
and passes resolved data into `LiveFeed → TrendingRow`. Listing card / detail
(FR-007) are optional this feature; if wired, they resolve their single game
the same way. Keep the resolver call server-side; the tile component just
renders what it's handed (mirrors how 034's Avatar takes resolved props).

## 8. What could break elsewhere

- **Trending grouping vs resolver normalisation drift** (research #3) — the
  top risk; a test should assert both agree on a variant pair.
- **N+1 on resolve** — batch it; a test/observation that Trending issues one
  resolve query, not five.
- **The AI merging distinct games** — human-approval is the guard (FR-018);
  no code mitigation makes an auto-merge safe, which is why it's not auto.
- **Blob `del()` near ADR 0005** — same file-vs-record note as 034; a game's
  *record* is soft-disabled, its *image file* is deleted.
- **`drizzle-kit push` on two new tables** — verify both landed by querying
  the DB; if it prompts on anything ambiguous it hangs, so keep the two
  tables unambiguous (new names, no rename adjacency).
