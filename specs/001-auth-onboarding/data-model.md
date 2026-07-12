# Phase 1 Data Model: Auth & Onboarding

## User (extends the existing `user` table)

The `user` table already exists (`src/db/schema.ts`) with `id`, `name`,
`email`, `emailVerified`, `image`, `passwordHash` — from the Auth.js
adapter schema plus the earlier native-login extension. This feature adds
the onboarding-collected fields to the same table (one account, one
profile — no separate profile table needed at this scope).

| Field | Type | Notes |
|---|---|---|
| `handle` | text, unique, not null | New. Letters+digits only, starts with a letter, ≤24 chars, immutable once set (FR-003). Shared uniqueness/format validation with the Credentials sign-up form and the onboarding fallback prompt (research.md #2). |
| `name` | text | Existing column, reused directly as "display name" (onboarding Step 1, FR-008) — no new column needed. |
| `avatarColor` | text | New. Stores a swatch *identifier* (e.g. `amber-orange`), not raw CSS/gradient values — keeps data decoupled from presentation styling. One of a fixed set of 5 (matching the wireframe's swatch palette). |
| `region` | text | New. One of: `na-east`, `na-west`, `eu-west`, `eu-east`, `asia`, `oceania` (FR-010). |
| `platforms` | text[] | New. Zero or more of: `pc`, `console`, `mobile`, `table` — optional per FR-010. |
| `ageGroup` | text | New. One of `18`, `21` only (FR-010, ADR 0002) — never `13`. |
| `vibe` | text | New. One of: `fun`, `serious`, `both` (FR-011). |
| `playTimeSlots` | text[] | New. Zero or more of: `morning`, `afternoon`, `evening`, `late`, `weekend` — optional per FR-011. |
| `gamesPlayed` | text[] | New. Free-text/keyword list, at least one entry once onboarding Step 2 is completed (FR-009). Consistent with ADR 0001's free-text approach to games elsewhere on the platform — not a reference to a catalog table. |
| `emailVerified` | timestamp \| null | **Existing column, reused as-is** (Auth.js adapter standard). Null = unverified. Set for Credentials accounts only once the emailed link is used; set automatically for Google accounts (research.md #1 notes Google's ID token carries its own `email_verified` claim, which a custom provider `profile()` mapping can use to set this accurately rather than assuming). |
| `passwordHash` | text \| null | Existing column, unchanged — null for Google-only accounts. |

All new fields except `handle` are nullable/empty-array by default, since
FR-012 requires that skipping onboarding at any step preserves only what
was already entered.

## EmailVerificationToken

**No new table** — reuses the existing Auth.js `verificationToken` table
(`identifier`, `token`, `expires`) already in `src/db/schema.ts`, keyed by
the user's email. A Credentials sign-up creates a row here; the emailed
(or, pre-domain, console-logged per research.md #1) link consumes it
exactly once, setting `user.emailVerified`.

## Validation rules (Zod, at the API boundary — Principle II)

| Field | Rule |
|---|---|
| `handle` | `^[a-zA-Z][a-zA-Z0-9]{0,23}$`, plus a uniqueness check against the database |
| `email` | standard email format (already implemented in `credentialsSchema`) |
| `password` | minimum 8 characters (already implemented) |
| `name` (display name) | non-empty, reasonable upper bound (assumption: 50 characters — not specified by the spec, a sensible technical default) |
| `avatarColor` | must be one of the 5 fixed swatch identifiers |
| `region` | must be one of the 6 listed regions |
| `platforms` | array, each element one of the 4 platform values, may be empty |
| `ageGroup` | must be `18` or `21` — rejecting `13` is itself a validation rule, not just a UI omission, so a request bypassing the UI can't smuggle it in |
| `vibe` | must be one of `fun`/`serious`/`both` |
| `playTimeSlots` | array, each element one of the 5 slot values, may be empty |
| `gamesPlayed` | array of non-empty strings; at least one entry required when Step 2 is being submitted as complete (not required if the step was skipped) |

## State notes

- `handle` is set exactly once (at Credentials sign-up, or at onboarding
  Step 1 for a Google account that doesn't have one yet) and is
  immutable thereafter (FR-003) — enforced at the write layer, not a
  multi-state lifecycle.
- `emailVerified` transitions null → timestamp exactly once, either
  automatically (Google) or via a consumed verification token
  (Credentials). It never reverts.
- Onboarding has no separate "in progress / complete" status field
  (deliberately — see research.md and the spec's Assumptions: skipping is
  a first-class terminal state, not a resumable draft this feature
  tracks).
