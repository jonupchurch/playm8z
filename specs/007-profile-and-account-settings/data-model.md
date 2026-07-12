# Phase 1 Data Model: Profile + Account settings

## User (extends the table from `001-auth-onboarding`)

| Field | Type | Notes |
|---|---|---|
| `bio` | text, nullable | New. Free text, user-editable. |
| `createdAt` | timestamp, not null, default now | New — needed for "joined" display; every other feature so far happened not to need it. |
| `privacyShowAge` | boolean, not null, default true | New. Consumed by the future Public Profile feature (this feature only stores it). |
| `privacyShowRegion` | boolean, not null, default true | New. |
| `privacyShowOnline` | boolean, not null, default true | New. |
| `privacyDiscoverable` | boolean, not null, default true | New. |
| `deactivatedAt` | timestamp, nullable | New. Non-null hides the profile/postings from other visitors (FR-013); cleared automatically on the owner's next successful sign-in (research.md #3). |

All fields from `001-auth-onboarding` (`handle`, `avatarColor`,
`region`, `platforms`, `ageGroup`, `vibe`, `playTimeSlots`,
`gamesPlayed`, `emailVerified`, `passwordHash`) remain unchanged. Note:
`gamesPlayed` (a flat list of game names from onboarding) is superseded
for *display* by `userGames` below, but isn't dropped — onboarding
still writes it, and it can seed a user's first `userGames` rows if
ever wired up (not required by this feature).

## UserGame (new table)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | |
| `game` | text, not null | Free-text keyword, per ADR 0001 — same convention as `postings.game`. |
| `rank` | text, nullable | Self-reported, free text (ranks vary too widely across games for a fixed enum — same reasoning ADR 0001 applies to the game field itself). |
| `hoursPlayed` | integer, nullable | Self-reported. |
| `createdAt` | timestamp, not null, default now | |

## SavedListing (new table — shared with Listing detail, `006-listing-detail`)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default random | |
| `userId` | uuid, not null, references `user.id` | |
| `postingId` | uuid, not null, references `postings.id` | |
| `createdAt` | timestamp, not null, default now | |

A unique constraint on `(userId, postingId)` prevents saving the same
listing twice. Unsaving deletes the row (data-model.md's note in
`006-listing-detail` explains why this is a scoped exception to ADR
0005's usual disable-don't-delete default).

## Validation rules (Zod, at the Server Action boundary — Principle II)

| Field | Rule |
|---|---|
| `name` (display name) | `z.string().trim().min(1).max(50)` (matches Auth & Onboarding's onboarding-time bound) |
| `region` | `z.enum([the 6 region values])` |
| `bio` | `z.string().max(300).optional()` |
| `game` (UserGame) | `z.string().trim().min(1).max(100)` |
| `rank` | `z.string().max(50).optional()` |
| `hoursPlayed` | `z.number().int().min(0).max(100000).optional()` |
| `currentPassword`/`newPassword` | reuses `credentialsSchema`'s password rule (min 8 chars) for `newPassword`; `currentPassword` just `z.string().min(1)` (its correctness is checked against the stored hash, not a shape rule) |
| `email` | reuses the existing email format rule from `credentialsSchema` |
| privacy toggles | `z.boolean()` each |
| posting edit fields | imports Post a Game's existing schemas for title/description/etc. (research.md #5) rather than redefining them |

## State notes

- `deactivatedAt` transitions null → timestamp (Deactivate) → null again
  (automatic, on next successful sign-in) — never a third state.
- `emailVerified` transitions to `null` again when the email changes
  (reusing Auth & Onboarding's existing null → timestamp transition on
  the new address) — the only feature besides Auth & Onboarding itself
  that resets this field.
- No soft-delete concern (ADR 0005) for `userGames` — a user removing a
  game they no longer play is a real delete, same reasoning as
  `SavedListing` (no audit/trust value in preserving it).
