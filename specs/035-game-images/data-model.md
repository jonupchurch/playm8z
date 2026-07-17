# Phase 1 Data Model: Game Headline Images

Two new tables. No change to `postings` — that is the whole point (ADR 0001
softened, not reversed; `postings.game` stays free text, no FK).

## New table: `games`

```
game
  id             uuid       PK, default gen_random_uuid()
  name           text       NOT NULL         -- canonical display name ("D&D 5e")
  normalizedName text       NOT NULL, UNIQUE  -- lower(trim(name)); the match key
  imageUrl       text       NULL             -- admin headline image (a Blob URL); null = use generated visual
  disabledAt     timestamp  NULL             -- soft-disable (ADR 0005); non-null = excluded from resolution
  createdAt      timestamp  NOT NULL, default now()
```

- **`normalizedName` UNIQUE** enforces FR-012 (no two games claim one name)
  and is the lookup key. It is `lower(trim(name))`.

  **Correction (verified during implementation, 2026-07-17):** research.md #3
  and an earlier draft here said this MUST equal how Trending groups, citing
  ADR 0001's "case-insensitive, trimmed" prose. The *code* groups Trending by
  the **raw** `postings.game` (see `get-trending.ts`), so "D&D 5e" and
  "d&d 5e" are two separate trending rows. That needs no change: the resolver
  normalises each raw trending string independently to look up an image, so
  both rows resolve to the same game's image (spec Edge Cases allow this).
  The rule that actually matters is that the *resolver* normalises
  consistently at write and read time — which is why there is one
  `normalizeGame()` helper — not that it match Trending's grouping.
- **`imageUrl` nullable** — a game can exist for aliasing/naming without an
  image; it then resolves to the generated visual. So "has a row" ≠ "has an
  image."
- **`disabledAt`** — soft-delete, same shape as `users.deactivatedAt` /
  `postings.removedAt`. A disabled game is skipped in resolution (falls to
  generated visual); its postings are untouched (they never referenced it).

## New table: `gameAliases`

```
gameAlias
  id               uuid       PK, default gen_random_uuid()
  gameId           uuid       NOT NULL, FK -> game.id ON DELETE CASCADE
  normalizedAlias  text       NOT NULL, UNIQUE  -- lower(trim(variant))
  createdAt        timestamp  NOT NULL, default now()
```

- **`normalizedAlias` UNIQUE** enforces alias-vs-alias uniqueness (FR-015).
- **The cross-table half of FR-015** — an alias must not equal any game's
  `normalizedName`, and a game name must not equal any existing alias — a
  single-table unique index cannot express. It is an **application check at
  write time** (add-alias checks `games.normalizedName`; create/rename-game
  checks `gameAliases.normalizedAlias`), with the per-table unique index as
  the race backstop. This is the exact pre-check-plus-unique-index pattern the
  handle-uniqueness code already uses — follow it, don't invent a new one.
- **`ON DELETE CASCADE`** is belt-and-braces: games are soft-disabled, not
  deleted (ADR 0005), so the cascade should never fire in normal operation.
  It only protects against a genuine hard-delete that policy forbids anyway.

## New table: `gameAliasDismissals`

```
gameAliasDismissal
  id               uuid       PK, default gen_random_uuid()
  normalizedName   text       NOT NULL, UNIQUE  -- an unmatched string the admin chose to leave unaliased
  createdAt        timestamp  NOT NULL, default now()
```

Tiny, and only serves US4 scenario 3: a game string the admin reviewed and
declined to alias should not keep reappearing in AI suggestions. The
suggestion query excludes strings present here. Without it, "reject" would
have no memory and every run re-proposes the same rejects. Not user-facing;
an admin could clear it if they change their mind (out of scope to build that
UI — the row is simply informational to the suggestion query).

## The resolution rule (read path, FR-001)

Given a raw posting game string `g`:

```
n = lower(trim(g))
game = games WHERE normalizedName = n AND disabledAt IS NULL
     ?? games JOIN gameAliases ON game.id = gameAlias.gameId
              WHERE gameAlias.normalizedAlias = n AND game.disabledAt IS NULL
if game and game.imageUrl:  → { admin, url: game.imageUrl }
else:                        → { generated, from: n }   // deterministic hash→gradient
```

Batched for Trending (≤5 names → one query with `normalizedName IN (...)` +
an alias join), never one query per name (research.md #1 — the N+1 trap).

## Image lifecycle (FR-011)

- **Set/replace image**: upload blob → set `imageUrl` → `del()` the prior
  blob if any (new first, then delete old, so a failed delete orphans rather
  than dangles).
- **Remove image**: `del()` blob → `imageUrl = NULL`. Game still exists; it
  now resolves to the generated visual.
- **Disable game**: `disabledAt = now()`. Distinct from removing the image —
  the record leaves resolution entirely.

`del()` frees a storage **file**; it is not a hard delete of a **record** and
so is outside ADR 0005 (same note as 034's data-model). The game *record* is
only ever soft-disabled.

## Not changed

- **`postings`** — untouched. No `game` FK, no new column. Postings never
  know games exist.
- **`get-trending.ts`'s grouping/counting** — unchanged (FR-006). This
  feature reads trending's output and resolves images for it; it does not
  alter what trending returns.
- **`settings`** — not used; games are not a flat string list.

## Migration note

Three new tables, all additive, no backfill. `drizzle-kit push`; verify all
three landed by querying the DB (a green exit code has no-op'd here). Keep the
table names unambiguous so push doesn't hit a rename prompt (which hangs
non-interactively). Production applies schema via `vercel-build`.
