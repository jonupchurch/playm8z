# Implementation Plan: Game Headline Images

**Branch**: `035-game-images` | **Spec**: [spec.md](./spec.md)

## Summary

Make a game name resolve to an image — an admin-curated one if set, otherwise
a distinct deterministic generated visual — and show it on Home's Trending
tiles instead of the flat orange block. Backed by an admin Games screen
(create games, upload images, manage aliases) with an AI-assist that
*proposes* aliases for admin approval. Two-plus new tables, one resolver, one
new admin surface, reused Blob + AI seams. ADR 0011 records the ADR 0001
softening.

The feature has a clear spine (the resolver) and three feeders around it
(admin CRUD, aliases + AI-assist, read-path wiring). Build the spine first
and prove it in isolation; the rest hangs off it.

## Technical Context

**Runtime**: TypeScript, Next.js App Router (consult
`node_modules/next/dist/docs/` per AGENTS.md).

**Storage**: Postgres via Drizzle (`drizzle-kit push`, not `db:migrate`);
Vercel Blob (ADR 0008); AI Gateway / Claude Haiku (ADR 0007).

**Gating**: `requireRole("moderator")` — content curation, like the News
editor. (The News *AI* action uses `admin`; §Constitution notes the choice.)

**Testing**: Vitest + Playwright.

## Constitution Check

| Principle | Status |
|---|---|
| I — Spec-driven; ADR for real tradeoffs | **Pass.** The ADR 0001 relationship is the central tradeoff and gets **ADR 0011**, with a pointer added into 0001 so neither can be read in isolation. |
| II — Validate at trust boundaries | **Pass.** Admin actions `requireRole` + Zod. The AI response is re-validated at our boundary (the gateway helper already does; the accept action re-checks FR-015 rather than trusting the proposal). |
| III — Tests prove behaviour | **Pass, pointed.** The two silent-failure risks — resolver/Trending normalisation drift, and AI auto-applying — get explicit tests (a variant pair both sides must agree on; an assertion that suggest writes nothing). Determinism of the generated visual is unit-tested directly. |
| IV — Scope discipline | **Pass.** Typeahead → 036. Count-merging out. Per-posting upload out. Hub page out. Three fences, all in the spec. |
| V — No hard deletes (ADR 0005) | **Pass.** Games soft-disable (`disabledAt`). Only *image files* are `del()`'d (file, not record — data-model note). |
| VI — Legible history | **Pass.** Admin game/alias actions log via the existing `logAuditEntry()` (category `content`). |

## Approach

### Phase A — Schema

`games`, `gameAliases`, `gameAliasDismissals` per data-model.md. Push, verify
all three by querying the DB. Names chosen to avoid any rename-adjacency that
would hang `drizzle-kit push`.

### Phase B — The resolver + generated visual (the spine, built & proven first)

- `src/lib/games/normalize-game.ts` — the shared `lower(trim)` rule.
  **First task**: read `get-trending.ts`'s actual grouping expression and make
  this identical (research.md #3); if trending groups inline, either refactor
  it to call this or document the exact match. A test asserts both agree on
  `"D&D 5e"` vs `" d&d 5e "`.
- `src/lib/games/generated-visual.ts` — pure hash(name) → gradient/hue +
  initial. Deterministic, no `Math.random` (banned here anyway). Tested:
  same name → identical; different names → different.
- `src/lib/games/resolve-game-image.ts` — `resolveGameImage(name)` and
  batched `resolveGameImages(names[])`. Normalises, looks up name+alias
  (excluding disabled), returns `{admin,url}` or `{generated,...}`. Batched to
  avoid the N+1 (research.md #1). Unit-tested against seeded games/aliases:
  name match, alias match, disabled game → generated, no match → generated.

This whole phase is pure/data and testable with zero UI — do it before any
screen exists, so the visible surfaces just consume a proven function.

### Phase C — Admin games CRUD + image upload

- `src/lib/actions/manage-game.ts` — create/rename (with FR-012 + FR-015
  cross-table checks), disable, upload/replace/remove image (Blob `put`/`del`,
  server-validated type/size), all `requireRole("moderator")` + `logAuditEntry`.
- New admin surface (its own route/page, not the Lists chip editor): list
  games, add, edit image, manage aliases. Follows the existing admin screen
  shell/patterns.

### Phase D — Aliases + AI-assist

- Manual alias add/remove in `manage-game.ts` (the FR-015 checks live here,
  shared with create/rename).
- `src/lib/actions/suggest-game-aliases.ts` — gather distinct unmatched
  normalised posting game strings (minus dismissals), call
  `generateStructuredDraft` with a `{suggestions:[{rawName,gameId|null}]}`
  schema, return proposals. **Writes nothing.** Catches a missing AI key and
  returns "unavailable" (FR-020).
- Accept-suggestion → the same alias-add path (re-runs FR-015). Reject →
  insert a dismissal row.

### Phase E — Read-path wiring

- `page.tsx` resolves the ≤5 trending games server-side
  (`resolveGameImages`) and passes resolved tiles into `LiveFeed → TrendingRow`.
- `trending-row.tsx:29` orange `<div>` → render the resolved image
  (`<img>` with `onError` → generated visual, mirroring 034's Avatar) or the
  generated visual directly.
- Listing card / detail (FR-007) adopt the resolver **only if clean**; the
  Trending block is the required surface, the rest is opportunistic.

### Phase F — Tests & verification

Unit: normalise, generated visual, resolver, each admin action, suggest
(mocked AI). Component: admin screen states, trending tile with/without image.
E2E: admin sets an image → it shows on the public Trending tile; a game with
no image shows a non-orange distinct tile; an alias makes a variant resolve.
Cross-check e2e reporter count vs `--list`.

## Risks

| Risk | Why real here | Mitigation |
|---|---|---|
| **Resolver and Trending normalise differently.** | They're written separately; if one is `lower(trim)` and the other just `lower`, a variant shows an image on one and not the other. | One shared `normalize-game.ts`; a test feeds a variant pair through both Trending grouping and the resolver and asserts agreement. Read trending's real expression first — don't trust the ADR's prose. |
| **AI auto-applies / wrong-merge.** | The lazy version writes aliases directly; "Souls"→Elden Ring silently corrupts curation. | suggest-action writes nothing (tested); accept is a separate human step re-running FR-015; SC-007. |
| **N+1 resolving trending.** | `names.map(resolve)` in a server component is 5 queries. | Batched `resolveGameImages`; a test/observation of a single query. |
| **FR-015 cross-table collision slips through.** | A DB unique index can't span name-vs-alias; a naive impl checks only one table. | Application check both directions + unique indexes as backstop; follow the handle-uniqueness precedent; tested for both collision directions. |
| **`del()` reads as an ADR 0005 violation.** | Reviewer "fixes" it. | data-model + code comment: file vs record; games soft-disable. |
| **Generated visual non-deterministic.** | A `Math.random` or `Date`-seeded palette flickers per load. | Pure hash; determinism unit-tested; both banned APIs unavailable anyway. |
| **Scope creep into count-merging / hub page.** | Aliases make merging counts *look* trivial and adjacent. | Out of Scope ×3 in spec; FR-006; this plan doesn't touch `get-trending`'s grouping. |

## Project Structure

```
specs/035-game-images/  spec · plan · research · data-model · quickstart · checklists/
docs/adr/0011-game-image-alias-layer.md          (+ pointer added into 0001)

src/
├── db/schema.ts                              # +games, +gameAliases, +gameAliasDismissals
├── lib/games/normalize-game.ts               # shared normalisation (matches trending)
├── lib/games/generated-visual.ts             # deterministic hash→visual
├── lib/games/resolve-game-image.ts           # the resolver (single + batched)
├── lib/actions/manage-game.ts                # CRUD + image + alias (FR-015 checks)
├── lib/actions/suggest-game-aliases.ts       # AI-assist, proposes only
├── app/admin/games/…                         # new admin surface
├── app/page.tsx                              # resolve trending games server-side
└── components/home/trending-row.tsx          # render resolved image / visual
```

## Complexity Tracking

This is the session's largest feature, and the size is real, not incidental —
new data model + admin tooling + AI loop + read path. It was already split
once (the Post-a-Game typeahead is 036). If, during Phase C/D, the admin
screen + AI-assist prove large enough to plan cleanly on their own, splitting
the **read path (A/B/E)** from the **admin tooling (C/D)** into a follow-on is
pre-authorised — the read path alone (resolver + generated visual + Trending
wiring, with games/aliases seedable by hand) already delivers SC-001 (no more
identical orange). Flag it if reached; don't split preemptively.
