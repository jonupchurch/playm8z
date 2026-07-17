# Phase 0 Research: Password Reset

Everything below was checked against the code, not recalled. Where a
previous feature's doc made a claim, the claim was re-verified — 001's
research.md asserted a "one-line swap" that turned out to be three things,
which is the immediate reason this file is sceptical by default.

## 1. Token storage — a new table, not `verificationToken`

**Decision**: a new `passwordResetTokens` table. Do **not** reuse
`verificationToken`.

**Rationale**: `verificationToken` (`src/db/schema.ts:747`) is
`(identifier, token, expires)` with PK `(identifier, token)` and **no
purpose column**. `src/app/api/auth/verify-email/route.ts:14-17` looks a
token up by `identifier + token` alone and, on any match, marks the email
verified. So sharing the table makes the two token kinds interchangeable:

- a reset token could be redeemed at `/api/auth/verify-email` (mild — it
  only verifies an address the holder already controls), and
- a **verification** token could be submitted to the reset endpoint to set
  a password (not mild — that is account takeover using a token minted for
  a weaker purpose).

Both currently require mailbox access, so the practical delta today is
small. That is not a reason to build it: purpose-confusion between bearer
tokens is a well-known vulnerability class, the cost of separating them is
one table, and the "both need the mailbox anyway" equivalence quietly stops
being true the moment any other flow ever mints a token into that table.

It also avoids a live collision: `update-email.ts` writes a verification
token keyed on the *new* address, and a reset flow deleting rows by
identifier could destroy a pending email change.

**Alternatives considered**: adding a `purpose` column to
`verificationToken` — rejected, it's Auth.js's adapter table (`@auth/drizzle-adapter`
owns its shape) and widening it invites the adapter and our code to
disagree about what a row means.

## 2. Tokens are stored hashed (FR-012)

**Decision**: generate a 32-byte random token, put the raw value in the
link, store **only its SHA-256 hash**. Look up by hashing the incoming
token and matching on the hash.

**Rationale**: a live reset token is a credential to take over an account.
Anyone who can read the table — a leaked backup, a SQL-injection read, an
over-broad admin query — could otherwise walk in as any user with an
outstanding reset. Hashing makes a stolen row useless. `verificationToken`
stores raw tokens, and that's a weaker position we should not copy into a
higher-stakes flow just for symmetry.

**SHA-256, not bcrypt**, deliberately. bcrypt exists to be slow against
brute force on *low-entropy* human passwords. A 32-byte random token has
256 bits of entropy — there is nothing to brute force, and a slow hash on
every redemption buys nothing while costing latency. This is the standard
distinction and worth stating because "we already use bcrypt for passwords"
is the obvious wrong turn here.

**Consequence**: the raw token can never be recovered from the database.
A support flow of "read the user's token out and paste it to them" is
impossible by construction. That's intended.

## 3. Session revocation is NOT a matter of deleting rows (FR-013)

**This is the finding that most changes the plan.**

`src/auth.ts:19` sets `session: { strategy: "jwt" }`, with a comment
explaining why: Credentials-provider sessions can't be looked up through
the adapter's database-session storage. So although a `session` table
exists (`schema.ts:84`), it is **not** what a logged-in Credentials user
has. A JWT is self-contained and stays valid until it expires, regardless
of what the database says. There is nothing to delete.

`src/auth.ts` also currently defines **no `jwt` and no `session`
callback** — so today an authenticated request performs *zero*
session-related database work.

**Decision**: add `users.sessionsValidAfter` (timestamp, nullable), set it
to `now()` on a successful reset, and reject any JWT issued before it, in
the Auth.js `session`/`jwt` callback.

**Cost, stated plainly**: this adds one indexed primary-key lookup to
**every authenticated request across the whole site**, including pages that
do no database work today. Roughly 1–3ms on pooled Neon. That is a sitewide
architectural change caused by one feature, which is why it gets an ADR
(0010) rather than a line in this file.

**Alternative considered and rejected — piggyback on the existing gates.**
`requireAuth()` and `requireVerifiedEmail()` already `SELECT` the user row
on every write action, so the check could ride along for **free**. Rejected
because it only covers *writes*: a stale session would still be able to
**read** private pages — inbox DMs above all — until the JWT expired, which
is 30 days by default. It also relies on every future private read
remembering to opt in, which is precisely the kind of rule that holds until
it doesn't. The user chose correctness over the saving, with the cost
stated (2026-07-16).

**Alternative considered and rejected**: rotating `AUTH_SECRET` — signs
out every user on the site to reset one password.

## 4. Rate limiting costs almost nothing here (FR-020)

**Decision**: throttle in the `passwordResetTokens` table itself. Before
issuing, look for a token created for that user within the last 60
seconds; if one exists, skip sending and return the same response as
always.

**Rationale**: the spec's checklist worried this requirement demanded new
infrastructure (playm8z has no rate limiter, no Redis, nothing). It
doesn't. FR-009 already requires knowing whether an earlier token is
outstanding for the account, which is the same fact a throttle needs — so
the row we must consult anyway *is* the rate limiter. No new dependency,
no new service.

**Critically**: the throttle must not become the enumeration oracle FR-004
forbids. A throttled request must be **indistinguishable** from a normal
one — same message, same status, no "try again in 42 seconds". The limit is
enforced silently on the send, never surfaced on the response. This is the
one place FR-004 and FR-020 actively fight, and it is easy to get wrong by
being helpful.

## 5. Enumeration (FR-004) — what "identical" has to mean

**Decision**: one response for all three cases (no account / Google-only
account / Credentials account), returned by a single code path that does
not branch on the outcome before responding.

Non-obvious consequences, each a real way to leak:

- The **Google-only** case must still send a message (FR-005), so
  "message sent?" cannot be the branch. It sends a *different* message.
- Response **timing** can leak. The no-account path does no bcrypt and no
  send; the Credentials path hashes a token and calls Resend. The spec says
  SHOULD avoid where practical, so: do the work **after** deciding the
  response, never gate the response on the send completing. `sendEmail()`
  already never throws, which makes this safe to do.
- Form **validation** must not leak either: an invalid-format address can
  say "that's not an email", but a well-formed unknown one must not.

## 6. Reuse, don't rebuild

- **Email**: `sendEmail()` (`src/lib/email/send-email.ts`) + `appUrl()`
  (`app-url.ts`), both shipped 2026-07-16. `send-verification-email.ts` is
  the reference caller. Two new senders, one path.
- **Password rules**: `credentialsSchema` (`src/lib/validations/auth.ts`,
  `z.string().min(8)`) — FR-015 requires a single shared definition, so the
  reset form's schema must *derive* from it, never restate `min(8)`.
- **Hashing**: `bcrypt-ts` `hash(password, 10)`, matching
  `register/route.ts:61`. A different cost factor here would make
  the two paths silently disagree.
- **Audit**: `logAuditEntry()` (`src/lib/admin/log-audit-entry.ts`).
  Category `access` fits a reset. Note `actorId` is nullable — a reset
  request has no authenticated actor, which is exactly why that column is
  nullable.

## 7. A reset must work for an *unverified* account

Not obvious, and easy to get backwards. FR-014 marks the email verified on
a successful reset. So the redemption path must **not** call
`requireVerifiedEmail()`-style gating on the account it's about to fix — an
unverified user who also forgot their password is precisely who is stuck
right now, and gating the fix on the thing the fix repairs would strand
them permanently.

## 8. `users.passwordHash` is nullable, and that's load-bearing

`schema.ts:24`. Google accounts never get one (`@auth/drizzle-adapter`
creates the row; only `register/route.ts` sets a hash).
`src/auth.ts:79` already relies on this: `if (!user?.passwordHash) return null`
is what stops a Google account being logged into with a guessed password.

So `passwordHash IS NULL` is the correct and only test for "this is a
Google-only account" (FR-005). It also means a completed reset **gives a
Google account a password** if we ever let one through — which FR-003/FR-005
forbid, and which the tests must pin, since it would silently create a
second login method for an account that never asked for one.
