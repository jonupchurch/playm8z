# Phase 1 Data Model: Password Reset

Two changes: one new table, one new column. Both verified against the
current `src/db/schema.ts` rather than proposed from memory — a
data-model.md in this project has been wrong about real field values
before (030/031), so every existing name below was read out of the file.

## New table: `passwordResetTokens`

```
passwordResetToken
  id          uuid        PK, default gen_random_uuid()
  userId      uuid        NOT NULL, FK -> user.id ON DELETE CASCADE
  tokenHash   text        NOT NULL, UNIQUE
  expires     timestamp   NOT NULL
  usedAt      timestamp   NULL
  createdAt   timestamp   NOT NULL, default now()
```

**Why a new table rather than `verificationToken`** — research.md #1. In
short: `verificationToken` has no purpose column and
`/api/auth/verify-email` matches on `identifier + token` alone, so sharing
it would make a verification token redeemable to set a password.

**Field notes:**

- **`userId`, not `identifier`.** `verificationToken` keys on the email
  address; this keys on the account. An address can change
  (`update-email.ts`), and a link issued before a change must still resolve
  to the account it was issued for rather than silently retargeting or
  dangling (spec Edge Cases). `ON DELETE CASCADE` because a reset token for
  a deleted user is meaningless — and note this is *not* in tension with
  ADR 0005 (no hard deletes): users are never deleted, so the cascade is
  belt-and-braces, not a deletion path.
- **`tokenHash`, not `token`.** SHA-256 of the raw token; the raw value
  exists only in the emailed link and is never stored (FR-012,
  research.md #2). **UNIQUE** because lookup is by hash alone — there is no
  identifier to pair it with, since the whole point is that the holder
  proves possession of the token and nothing else.
- **`usedAt`, not deleting the row.** Redemption sets `usedAt` rather than
  removing the row, so "already used" is distinguishable from "never
  existed" *server-side* (for audit and debugging) while both are
  identical *to the user* (FR-018). Deleting would also make FR-009's
  supersede semantics indistinguishable from redemption in the audit trail.
- **`createdAt`** carries FR-020's throttle (research.md #4) as well as
  ordering. It is the reason no rate-limiting infrastructure is needed.

**A token is valid iff**: `usedAt IS NULL` **and** `expires > now()` **and**
it is the newest row for its `userId`. That last clause is FR-009
(supersede) and is a real trap: without it, invalidating "earlier" tokens
by *only* issuing a new one leaves the old rows still individually valid.
Implement supersede as an explicit write (mark prior rows used at issue
time), not as an implicit consequence of ordering — a `SELECT ... ORDER BY
createdAt DESC LIMIT 1` check would be a TOCTOU race between two concurrent
requests.

**Indexes**: `tokenHash` gets one from UNIQUE. Add one on `userId` — every
issue-time supersede and throttle check filters by it.

**Retention**: rows are not deleted. Consistent with ADR 0005, and a used
or expired row is a record that a reset happened, which FR-017's audit
requirement wants anyway. A hashed, used token is inert.

## Changed table: `users`

```
sessionsValidAfter   timestamp   NULL     -- new
```

Every JWT issued before this instant is refused (FR-013, ADR 0010). `NULL`
means "never revoked", which is the correct default for every existing row
— a migration must not backfill `now()`, or it would sign out every user on
the site at deploy.

Set to `now()` on a successful reset. Nothing else writes it today; a
future "sign out everywhere" button or a password *change* while logged in
(out of scope here) would write the same column, which is a point in favour
of it living on `users` rather than inside this feature.

**Comparison is against the JWT's `iat`** (issued-at), which Auth.js sets
in seconds. `sessionsValidAfter` is a `timestamp` with sub-second
precision, so the comparison must be done at a consistent granularity or a
token issued in the same second as a reset could survive by rounding.
Truncate/floor both to the second, and treat "equal" as **invalid** (fail
closed) rather than valid.

## Untouched, and deliberately so

- **`users.passwordHash`** — nullable already, and load-bearing:
  `auth.ts:79`'s `if (!user?.passwordHash) return null` is what stops a
  Google account being password-logged-in. The reset flow reads it to
  detect a Google-only account (FR-005) and writes it only on redemption.
  No shape change.
- **`verificationToken`** — untouched. FR-014 marks the email verified by
  writing `users.emailVerified` directly, not by minting a verification
  token.
- **`session`** — untouched, and worth stating: it exists because
  `@auth/drizzle-adapter` creates it, but Credentials logins are JWTs and
  never populate it. Deleting rows from it would revoke nothing. See
  research.md #3 before anyone "fixes" this.
