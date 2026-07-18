# Data Model: Enforce blocks on party/listing interactions

No schema change. This feature adds a read-only precondition to four write paths.

## `blocks` (read-only input — unchanged)

The existing table. A directional record (`blockerId`, `blockedId`, `unblockedAt`), but consumed
**symmetrically**: an active block (`unblockedAt IS NULL`) in either direction between two users
refuses their interaction. Read exclusively through `hasActiveBlockBetween(a, b)`; never written here.

## Guarded interactions (new precondition, unchanged shape)

| Path | Relationship checked | On active block |
|------|----------------------|-----------------|
| `applyToPosting` | applicant ↔ posting.hostId | refuse; no `applications` row created |
| `askQuestion` | asker ↔ posting.hostId (posting now loaded) | refuse; no `questions` row created |
| `inviteToParty` | host ↔ invitedUserId | refuse; no `applications` row created |
| `acceptRequest` | applicant ↔ posting.hostId | refuse (throw → rollback); seats/roster/conversation unchanged |

- `applications`, `questions`, `conversations`, `postings.seatsOpen/status` — shapes all unchanged;
  the feature only adds a gate before they are written.
- The acting user vs. the *other* user is what's compared — never the acting user against themselves
  (a self pair is never an active block, so the host-asks-own-listing allowance survives).

## Validation / auth (unchanged)

All four paths keep `requireVerifiedEmail` + their Zod input schemas. The block gate is an added
server-side authorization precondition (Principle II), evaluated after auth + validation, before the write.
