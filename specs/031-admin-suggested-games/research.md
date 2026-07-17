# Phase 0 Research: Admin-editable Suggested Games

**Feature**: [spec.md](./spec.md) | **Date**: 2026-07-16

Every finding below was checked against the code, not recalled.

---

## 1. Where the list lives: another `settings` column

**Decision**: `suggestedGames: text("suggestedGames").array().notNull().default([...the fourteen
current games])` on the existing `settings` singleton (`src/db/schema.ts:98-139`).

Identical reasoning to feature 030's genre column: `bannedPhrases` (`schema.ts:115`) is the existing
admin-editable `text[]` precedent, and the schema comment forbids "a second, competing config table".
The column default reconciles every environment on the deploy that adds it (`vercel-build` runs
`drizzle-kit push`), so no seed script and no manual production write.

---

## 2. **This feature shares a tab with 030 — merge order matters**

Both this feature and 030 (Admin-editable Genres) put a list editor in the **same new Lists tab** of
Admin → Settings, because the user chose that location for both.

**Decision**: **030 creates the Lists tab; 031 adds a second section to it.** 030 merges first.

**Consequence, stated plainly so it isn't discovered as a merge conflict**: this branch was cut from
`main` *before* 030 merged. Once 030 is in, this branch must take 030's `main` before its own tab work
lands, or both features will independently create a Lists tab and the second merge will conflict in
the settings tab host and in `settings-lists.tsx`.

**If 030 is dropped or deferred**, this feature inherits creating the tab. The two are otherwise
independent: different columns, different consumers, no shared logic beyond the tab shell and the
chip-editor pattern they both borrow from the Moderation tab.

---

## 3. The critical difference from 030: **there is no validation coupling at all**

`src/lib/validations/onboarding.ts:61` — `gamesPlayedSchema = z.array(z.string().trim().min(1))`.

A new user's games are validated only as *non-blank strings*. They are **not** checked against
`SUGGESTED_GAMES`, and never have been. This is ADR 0001 working as designed (games are free-text
keywords; there is no curated Game catalog).

**Therefore**: removing a game from the suggestions has **zero** validation consequence and **zero**
data consequence. There is no equivalent of 030's hard problem here — no `z.enum` to make dynamic, no
create-vs-edit tolerance rule, no trust boundary to re-reason. This feature is genuinely small, and
that is a finding, not an assumption.

**FR-007** ("changing the suggestions MUST NOT restrict what games a player can have") is therefore a
statement of *existing* behaviour to preserve, not new work. The way to violate it would be to "tidy
up" by validating `gamesPlayed` against the list — which would silently turn the suggestion list into
the catalog ADR 0001 explicitly rejected. It must not be done.

---

## 4. The list is the entire choice set during account creation

`src/components/auth/onboarding-wizard.tsx:18-33,336` — `SUGGESTED_GAMES` is rendered as toggle chips
and there is **no free-text game input** on that step. A new user can only pick from the suggestions.

**Consequence**: an empty list turns the step into a dead end that looks broken (there is nothing to
click), even though the step is skippable. This is why FR-009 refuses an empty list — a rule that
would be arbitrary for an ordinary list but is load-bearing here.

Players can add arbitrary games later from their profile (`src/lib/actions/manage-games.ts`), so the
list constrains the *onboarding moment* only, never the player.

---

## 5. Getting the list into the wizard: prop, not import

`src/app/(auth)/onboarding/page.tsx:8,30` — `OnboardingPage` is already an `async` server component
that renders `<OnboardingWizard ...>` with props. The wizard is a client component (`"use client"`).

**Decision**: the page reads the list and passes it down as a prop.

**Why it must be a prop**: a client component that imports a runtime value from a module reaching
`@/db` crashes the page — a mistake already made and fixed once in this project. The server parent
already exists and already passes props, so this costs one prop and no restructuring.

---

## 6. Write path and read path: unchanged, established

Write: `requireRole("admin")` → Zod parse → `upsertSettings()` → `logAuditEntry()` →
`revalidatePath("/admin/settings","layout")`, exactly as `save-moderation-settings.ts` does. Satisfies
FR-011 (admin-only) and FR-012 (audit).

Read: `getSettings()` — Zod-validated, 5-second TTL cache, falls back to `DEFAULTS` on parse failure.
That cache is why SC-002 says "within seconds".

**The trap**: `revalidatePath()` does not invalidate that in-memory cache — they are separate layers.
`upsertSettings()` calls `invalidateSettingsCache()` itself, so every write in this feature is safe
*because* it goes through `upsertSettings` and not the table directly.

**Sharing the save action with 030**: if 030's `save-lists-settings.ts` exists by then, this feature
extends it to carry both arrays rather than adding a second action for the same tab — one tab, one
save, one audit entry per save.

---

## 7. `SUGGESTED_GAMES` becomes the default, not the runtime source

The const at `onboarding-wizard.tsx:18-33` moves out of the client component and becomes
`DEFAULT_SUGGESTED_GAMES` next to the schema, used **only** as the column default and seed. Nothing
reads it at request time afterwards — otherwise the wizard and the stored list could disagree, which
is the whole class of bug this feature removes.

---

## 8. The adjacent defect that must NOT be fixed here

Account creation writes games to `users.gamesPlayed` (`schema.ts:36`, via
`src/app/api/onboarding/route.ts`), while the profile flow maintains a separate `userGames` table
(`schema.ts:274-283`, via `src/lib/actions/manage-games.ts`). These are two different stores for what
reads like the same thing, and `users.gamesPlayed` is effectively onboarding-only.

**Decision: out of scope. Do not touch it.** It predates this feature, is invisible to an admin
editing suggestions, and fixing it is a data-migration feature of its own. Folding it in would
violate Principle IV and turn a small, safe change into a risky one. Recorded here only so the
implementation phase recognises it as known and deliberate rather than rediscovering it and quietly
"tidying" it in.
