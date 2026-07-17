# Tasks: Game Headline Images

**Feature**: `035-game-images` | **Plan**: [plan.md](./plan.md)

`[P]` = parallelisable with neighbours. Ordered by hard dependency. The spine
(Phase B) is built and proven before any surface consumes it.

## Phase A — Schema

- [ ] **T001** Add `games`, `gameAliases`, `gameAliasDismissals` to
      `src/db/schema.ts` per data-model.md (`normalizedName` UNIQUE on games;
      `normalizedAlias` UNIQUE on aliases; `disabledAt` soft-delete; FK
      cascade on aliases).
- [ ] **T002** `npx drizzle-kit push`. **Verify all three tables + their
      unique indexes exist by querying the DB**, not by exit code.

## Phase B — The spine: normalise → resolve → generated visual (prove first)

- [ ] **T003** **Read `get-trending.ts`'s actual grouping expression first.**
      Then `src/lib/games/normalize-game.ts` implementing the identical rule
      (`lower(trim)` at least). If trending groups inline, refactor it to use
      this helper or document the exact-match. This is the drift-prevention
      task, not a formality.
- [ ] **T004** [P] `src/lib/games/generated-visual.ts` — pure
      `generatedVisual(name)` → deterministic gradient/hue + initial from a
      hash of the normalised name. No `Math.random`/`Date`.
- [ ] **T005** [P] Unit tests for T003/T004: normalise agrees for a variant
      pair (`"D&D 5e"` vs `" d&d 5e "`); generated visual is identical for the
      same name across calls and **different** for two different names.
- [ ] **T006** `src/lib/games/resolve-game-image.ts` —
      `resolveGameImage(name)` + batched `resolveGameImages(names[])`.
      Normalise → match game name, else alias, excluding `disabledAt` →
      `{admin,url}` if imageUrl set, else `{generated,...}`. Batched = one
      query for many names.
- [ ] **T007** Unit tests for T006 (seed games/aliases): name match → admin
      image; alias match → the game's image; game with null image → generated;
      disabled game → generated; no match → generated; **batched call issues
      one query, not N** (the N+1 guard).

## Phase C — Admin games CRUD + image upload

- [ ] **T008** `src/lib/actions/manage-game.ts`: create/rename game
      (Zod; FR-012 normalised-name uniqueness; FR-015 cross-table check vs
      aliases), disable game (`disabledAt`), upload/replace/remove image
      (Blob `put`/`del` under `game-images/`, server-validate type+size reusing
      029/034 constraints). All `requireRole("moderator")` + `logAuditEntry`
      (category `content`).
- [ ] **T009** [P] Unit tests for T008 (mock `@vercel/blob`): rejects dup
      normalised name; rejects a name colliding with an existing alias;
      rejects wrong-type/oversize image; `del()`s prior blob on replace;
      disable sets `disabledAt`; non-moderator refused.
- [ ] **T010** New admin surface `app/admin/games/…` (its own page, NOT the
      Lists chip editor): list games, add, edit/upload image, per-game alias
      management. Follows the existing admin shell.
- [ ] **T011** [P] Component tests for T010: add/edit/upload states, error
      surfaces, moderator-gated.

## Phase D — Aliases + AI-assist

- [ ] **T012** Manual alias add/remove in `manage-game.ts` — the FR-015
      checks (unique alias; not equal to any game name; not equal to another
      alias) live here and are shared with create/rename. Unit-tested for both
      collision directions.
- [ ] **T013** `src/lib/actions/suggest-game-aliases.ts`: gather distinct
      unmatched normalised posting game strings (minus `gameAliasDismissals`),
      call `generateStructuredDraft` with a `{suggestions:[{rawName,
      gameId|null}]}` schema (Zod-validated), **return proposals, write
      nothing**. Catch a missing AI key → `{available:false}` (FR-020).
- [ ] **T014** Accept-suggestion → the T012 alias-add path (re-runs FR-015).
      Reject → insert a `gameAliasDismissals` row.
- [ ] **T015** [P] Unit tests for T013/T014 (mock the `ai` package as 028's
      tests do): suggest returns proposals and creates **no** alias (SC-007);
      accept creates one via the FR-015-checked path; reject creates a
      dismissal and the string is excluded from the next suggest; no AI key →
      graceful unavailable, manual management still works.

## Phase E — Read-path wiring (the visible payoff)

- [ ] **T016** `app/page.tsx`: resolve the ≤5 trending games server-side via
      `resolveGameImages` and pass resolved tiles into `LiveFeed → TrendingRow`.
- [ ] **T017** `components/home/trending-row.tsx`: replace the orange `<div>`
      (line ~29) with the resolved image (`<img>` + `onError` → generated
      visual) or the generated visual directly. Trending's label/count
      unchanged (FR-006).
- [ ] **T018** [P] Listing card / detail (FR-007) — adopt the resolver **only
      if clean**; note explicitly if deferred. Not required for the feature.
- [ ] **T019** [P] Component test: a trending tile shows an admin image when
      resolved to one, and a (non-orange) generated visual when not.

## Phase F — E2E, governance, close-out

- [ ] **T020** E2E: as a moderator, add a game matching an open posting's game,
      upload an image → it appears on the public Trending tile. A different
      trending game with no image shows a distinct non-orange tile (SC-001).
- [ ] **T021** [P] E2E: add an alias for a variant spelling → a posting with
      that spelling resolves to the game's image on Trending.
- [ ] **T022** Confirm ADR 0011 is committed and the pointer is in ADR 0001
      (done in the docs commit; re-verify the link resolves).
- [ ] **T023** Full verification: typecheck, lint, Vitest, Playwright.
      Cross-check the e2e reporter count against `playwright test --list`.
- [ ] **T024** Note in `docs/future-work.md`: count-merging across aliases and
      a per-game hub page remain deferred (this feature opened the door but
      walked through neither).
