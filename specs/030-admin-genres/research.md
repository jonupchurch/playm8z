# Phase 0 Research: Admin-editable Genres

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-16

Every finding below was checked against the code, not recalled. File/line references are as of this
date.

---

## 1. Where the list lives: a new `settings` column, not a new table

**Decision**: add `genres: text("genres").array().notNull().default([...eight current genres])` to the
existing `settings` singleton (`src/db/schema.ts:98-139`).

**Why**: `settings` already carries an admin-editable string array with exactly this shape —
`bannedPhrases: text("bannedPhrases").array().notNull().default([...])` (`schema.ts:115`), edited via
add/remove chips in `src/components/admin/settings-moderation.tsx:31,47-53` and saved through
`src/lib/actions/save-moderation-settings.ts`. The schema's own comment forbids "a second, competing
config table". The user independently chose the Admin → Settings location, so the storage and the UI
precedent agree.

**Rejected**: a dedicated `genres` table. It buys per-row metadata (icon, sort order, active flag) —
all explicitly out of scope (spec Assumptions) — at the cost of a join, a migration, and the exact
second config surface the schema warns against.

**Migration**: additive column with a default. Per
[[project_playm8z_prod_db_migration_gap]]'s resolution, `vercel-build` runs `drizzle-kit push` on
every deploy, so no manual prod push is needed. The default seeds existing rows, so behaviour is
unchanged until an admin edits (spec Assumptions: "Seed content").

---

## 2. `GENRES` becomes the default, not the runtime source

**Decision**: keep the array in `src/lib/validations/browse-filters.ts:3-12`, renamed to
`DEFAULT_GENRES`, used **only** as the column default and as the seed. Nothing reads it at request
time any more.

**Why**: FR-005 says the two screens can never disagree. Today they can't because they import one
const; afterwards they can't because they read one stored row. Keeping the const *also* readable at
runtime would recreate the drift the feature exists to prevent — one screen on the const, one on the
row, and a bug nobody sees until an admin edits.

---

## 3. The hard part: `z.enum(GENRES)` cannot be a runtime list

Genre is validated at two boundaries today:

- `src/lib/validations/posting.ts:29` — `genre: z.preprocess(emptyToUndefined, z.enum(GENRES).optional())`
- `src/lib/validations/browse-filters.ts:35` — `genres: z.preprocess(toArray, z.array(z.enum(GENRES)).max(8)).catch([])`

Both are **static module-level schemas**. `z.enum()` needs its values at module-evaluation time; the
stored list is only knowable per-request. Three options were considered:

| Option | Verdict |
|---|---|
| **A. Schema factory** — `makePostingSchema(genres)`, built per request | **Rejected.** `postingSchema` exports `PostingInput`/`PostingData` via `z.infer`, and `PostingInput` is consumed in `src/components/profile/posting-management-card.tsx:96`. A factory makes those types awkward and ripples into a client component for no user-visible gain. |
| **B. Async `.refine()`** calling `getSettings()` inside the schema | **Rejected.** Forces `safeParseAsync` at both call sites, and interacts badly with `.catch([])` on the browse array. Hides a database read inside a validation schema — the least legible option (Principle I). |
| **C. Zod validates shape; membership is checked separately** | **Chosen.** See #4 and #5. |

**Decision (C)**: Zod keeps validating *shape* (a trimmed string, length-capped, array-capped);
*membership* in the admin's list is checked where the value is used.

**Principle II check — deliberately reasoned, not waved through.** The constitution requires
validation at every trust boundary using Zod. That still holds: both boundaries still parse
visitor-controlled input through Zod before anything downstream sees it. What moves is the
*membership* test, which is business rule rather than input hygiene — and it cannot be expressed as a
static enum once the list is data. The safety-critical property (a visitor-controlled string reaching
a SQL `WHERE`) is unaffected: Drizzle parameterises, and `inArray` with an unknown string simply
matches nothing. This is a legibility trade, not a safety one, and it is recorded here so a future
reader doesn't "restore" the enum and silently re-freeze the list.

---

## 4. Posting: strict on new values, tolerant of a value already stored

FR-008 (reject an unlisted genre) and US2 scenario 5 (a host re-saving an old MOBA posting must
succeed, keeping MOBA) are **both required and look contradictory**. They are not: strictness applies
to values *arriving*, tolerance to values *already stored*.

**Decision**:

- `src/lib/actions/create-posting.ts:31` — after `postingSchema.safeParse`, reject when a genre is
  present and not in the stored list.
- `src/lib/actions/manage-posting.ts:35` — the edit path. Reject only if the submitted genre is
  **both** absent from the stored list **and** different from the posting's currently stored genre.
  Re-saving an unchanged retired genre succeeds; switching *to* a retired genre does not.

**Why this shape**: `manage-posting.ts` already loads the posting it is editing (it must, to check
ownership), so its current genre is in hand — no extra query. Applying `create`'s rule to `manage`
would strand every host whose genre got retired: they could never edit their own posting's title
again without also being forced to change its genre. That is the single most likely way to get this
feature wrong, which is why the spec pins it as an acceptance scenario.

---

## 5. Browse: drop the unknown value, keep the rest

**Decision**: `genres: z.preprocess(toArray, z.array(z.string().max(50)).max(8)).catch([])`, then
intersect the parsed list against the stored genres in the Browse page before calling
`searchPostings`.

**Behaviour change, deliberate and spec-mandated**: today one invalid genre fails the whole
`z.array(z.enum(...))` parse, `.catch([])` fires, and the *entire* genre filter is silently dropped —
`?genres=FPS&genres=MOBA` with MOBA retired currently shows **everything**, ignoring FPS too.
Intersecting instead keeps FPS and drops MOBA, which is what FR-009 actually says ("the unknown value
is ignored"). Worth stating plainly because it is a real change to existing behaviour, not just a
refactor.

**Why not just pass unknown values to the query**: `inArray(postings.genre, ["MOBA"])`
(`src/lib/postings/search-postings.ts:64`) matches nothing, so a retired-genre bookmark would show an
empty Browse rather than ignoring the filter. Empty-because-the-filter-is-stale reads as "there's
nothing here", which is exactly the broken state US2 scenario 4 forbids.

---

## 6. Landing genre counts

`src/lib/landing/get-landing-stats.ts:5,88` maps over `GENRES` to build its counts. It becomes a read
of the stored list (FR-006). It is already a server-side function, so this is a one-line source swap.

---

## 7. Reading the list: `getSettings()` already does the right thing

`src/lib/settings/get-settings.ts` is a Zod-validated read with a hand-rolled 5-second TTL cache that
falls back to `DEFAULTS` on parse failure. That cache is why SC-002 says "within seconds" rather than
"instantly", and it is sufficient — no new caching, and no cache to design.

**The trap**: `revalidatePath()` does **not** invalidate that in-memory cache; they are two separate
layers. `src/lib/settings/upsert-settings.ts` already calls `invalidateSettingsCache()` itself, so any
write that goes through `upsertSettings` is safe. A write that touched the table directly would not
be. Every write in this feature goes through `upsertSettings`.

---

## 8. Write path: the established admin-settings chain, unchanged

`requireRole("admin")` → Zod parse → `upsertSettings()` → `logAuditEntry()` →
`revalidatePath("/admin/settings","layout")`, as in `src/lib/actions/save-moderation-settings.ts`.
This satisfies FR-012 (admin-only, and `requireRole` reads the real `users.role` column since feature
024) and FR-013 (audit trail) with no new mechanism.

Duplicate/blank/empty rules (FR-010, FR-011) are ordinary Zod on the incoming array, plus a
case-insensitive uniqueness `.refine()`. Casing is preserved as typed (FR-014) — the comparison
lowercases, the stored value does not.

---

## 9. Where Browse and Post-a-Game get the list from

Both currently `import { GENRES }`. Both need it per-request instead:

- `src/components/browse/filter-sidebar.tsx:3,178` — client component. The Browse page (server) reads
  the list and passes it down as a prop.
- `src/components/post-game/post-game-form.tsx:6,11` — client component, same treatment from `/post`.

**Precedent worth following**: a client component importing a runtime value from a module that reaches
`@/db` crashes the page — a mistake already made and fixed once in this project. Passing the list down
as a prop from a server component is the shape that avoids it, and is what the nav's Pages dropdown
does with its own settings-derived data.
