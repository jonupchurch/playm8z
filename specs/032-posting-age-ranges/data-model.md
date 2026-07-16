# Phase 1 Data Model: Posting age groups become demographic ranges

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-16

## No schema change. No migration.

This is the whole data-model story, and it is worth stating rather than leaving as an absence.

`postings.ageGroup` (`src/db/schema.ts:172`) is already:

```ts
ageGroup: text("ageGroup").notNull(),   // 18|21 only (ADR 0002) -- never 13.
```

Plain `text`, `NOT NULL`, **no Postgres enum, no check constraint, no foreign key**. The vocabulary
has only ever been enforced in code (Zod). So changing the vocabulary is a code change; the column is
already capable of holding the new values today.

**The comment on line 172 must change** — `18|21 only (ADR 0002)` becomes false the moment this ships,
and a stale comment asserting a superseded ADR is worse than no comment. It should point at ADR 0009.

## Value vocabulary

| Stored token | Displayed | Meaning | Offered? |
|---|---|---|---|
| `any` | Any | No age preference — **the default** | Yes |
| `18-29` | 18-29 | Party is for roughly 18-29 | Yes |
| `30-49` | 30-49 | Party is for roughly 30-49 | Yes |
| `50plus` | 50+ | Party is for 50 and over | Yes |
| `18` | 18+ | **Legacy.** Meant "everyone welcome" | No — display only |
| `21` | 21+ | **Legacy.** Meant "21+ only" | No — display only |

**`50plus`, not `50+`** — the browse filter travels in a URL query string, where `+` decodes to a
space. Stored as `50+`, the filter would arrive as `"50 "` and match nothing: a bug that appears only
in a real browser and never in a test that passes the value directly (research.md #1).

**Legacy rows are data, not debt.** They exist for at most 30 days (postings auto-expire, ADR 0003)
and are never rewritten (FR-011). Both rows above must therefore survive two paths that will be
tempted to drop them:

1. the **label map**, which must render `18` → "18+" and `21` → "21+" (FR-012), and
2. the **edit form**, which must offer the stored legacy value as a selectable option so an unrelated
   save can't silently relabel the posting (research.md #5).

## Unchanged entity: `users` (deliberately)

| Field | Type | Change |
|---|---|---|
| `ageGroup` | `text` (nullable) | **None.** Still `18 \| 21`. |

`users.ageGroup` (`src/db/schema.ts:33`) keeps ADR 0002's vocabulary and its meaning — a player's own
self-described age tag (FR-013).

**After this feature, `ageGroup` means two different things depending on the table.** That is the
decision (ADR 0009), not an inconsistency to reconcile. The failure mode is a future reader noticing
the mismatch and "fixing" one side.

```text
users.ageGroup     : 18 | 21                        -- a player's own tag  (ADR 0002, unchanged)
postings.ageGroup  : any | 18-29 | 30-49 | 50plus   -- who a party is for  (ADR 0009)
                     (+ legacy 18 | 21, display-only, expiring)
```

## Relationships

**None, and none may be added.** `postings.ageGroup` and `users.ageGroup` are never compared, joined,
or matched against each other. The tag is not a gate (FR-010): it must never appear in a join, apply,
or accept path. It appears in exactly two places:

| Path | Use |
|---|---|
| Display | `postingAgeLabel(stored)` → text |
| Browse filter | `eq(postings.ageGroup, filter)` when the filter is not `any` (`search-postings.ts:71`) |

`search-postings.ts:71` needs no change: it already skips the condition when the filter is `any` and
otherwise does an exact match — which is exactly FR-006 and FR-016.

## State transitions

A posting's age group is set at creation (default `any`) and may be changed by its host while editing.
There is no lifecycle beyond that. A legacy value can be changed *away from* but never *to* — the
create path rejects legacy values outright, and the edit path accepts exactly one extra value: the one
that row already holds (research.md #4).
