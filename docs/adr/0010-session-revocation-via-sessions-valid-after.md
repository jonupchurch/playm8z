# ADR 0010: Session revocation via `users.sessionsValidAfter`

**Status**: Accepted

**Date**: 2026-07-16

**Feature**: `033-password-reset` (FR-013)

## Context

Password reset (033) requires that a successful reset end the account's
existing sessions. A reset is what someone does when they suspect their
password is known to somebody else; leaving that somebody signed in defeats
the point of the reset entirely.

playm8z uses **JWT sessions** — `src/auth.ts:19`, `session: { strategy:
"jwt" }`, with a comment recording why: Credentials-provider sessions
cannot be looked up through `@auth/drizzle-adapter`'s database-session
storage, so JWTs are effectively forced by having Credentials as a
provider at all.

The consequence is easy to miss and was nearly missed here. A `session`
table exists in the schema (`schema.ts:84`) because the adapter defines
one — but a logged-in Credentials user does **not** have a row in it. Their
session is a self-contained signed token held by their browser, valid until
its own expiry, regardless of anything in the database. **There is nothing
to delete.** Any plan that says "delete their sessions" is describing a
table that isn't used.

`src/auth.ts` also defines no `jwt` and no `session` callback, so today an
authenticated request does **zero** session-related database work. That is
the baseline any revocation scheme is priced against.

## Decision

Add `users.sessionsValidAfter` (nullable timestamp). On a successful
password reset, set it to `now()`. In the Auth.js `session`/`jwt` callback,
reject any JWT whose `iat` (issued-at) precedes it.

`NULL` means "never revoked" and is the default for every existing row.

Comparison is floored to whole seconds on both sides, because `iat` is in
seconds and the column is sub-second. **A tie is NOT revoked**, and that
is deliberate — see below.

### The tie goes to the token (corrected during implementation)

This ADR first specified the opposite: a tie was to be treated as invalid,
"fail closed", on the reasoning that ambiguity should resolve toward
safety. That was **wrong, and shipped a real lockout** before the e2e
caught it:

- reset lands at `t=100.7` → `sessionsValidAfter` floors to `100`
- the user logs in with their new password at `t=100.9` → that token's
  `iat` is also `100`
- `iat <= 100` → the **brand-new session is revoked**, and they're bounced
  back to `/login`

Reset your password, log in, get thrown straight out. The unit test asserted
"tie = revoked" and passed cheerfully, because it encoded the same wrong
assumption as the code; only `e2e/password-reset.spec.ts` — which actually
logs in afterwards — exposed it.

The question worth asking is *whose* token is issued in the same second as
a reset. In practice, essentially always the person who just reset. The
adversarial reading requires an attacker to log in **with the old password,
in the same second the reset lands** — using the very credential the reset
is in the middle of changing. Trading a guaranteed lockout of every real
user against that is a bad deal.

So ties go to the token: a window of at most one second, available only to
someone who already had the password.

"Fail closed" is a good instinct that was load-bearing in the wrong
direction here. The lesson generalises: *which* side an ambiguous case
actually falls on matters more than which side sounds safer.

## Consequences

### The cost, stated plainly

This adds **one indexed primary-key lookup to every authenticated request
across the entire site** — including pages that currently perform no
database work at all. Roughly 1–3ms against pooled Neon.

That is a sitewide architectural change introduced by a single feature,
which is the reason this is an ADR and not a paragraph in
`specs/033-password-reset/research.md`. Anyone later profiling a slow page
and finding an unexplained user lookup in the auth path should find this
document rather than reverse-engineer it.

### What it buys

Real revocation, covering **reads as well as writes**. A stale session
cannot browse an inbox, not merely be prevented from posting.

### What was rejected

- **Piggyback on `requireAuth()` / `requireVerifiedEmail()`** — both
  already `SELECT` the user row on every write action, so the check could
  have ridden along at **zero** cost. Rejected because it only covers
  writes: a stale session could still **read** private data (inbox DMs
  above all) until the JWT expired — 30 days by default. It further
  depends on every future private read remembering to opt in, which is the
  kind of rule that holds right up until someone adds a page and doesn't
  know it exists. The user was given this trade-off explicitly, with the
  per-request cost named, and chose correctness (2026-07-16).
- **Shortening the JWT lifetime** — bounds the exposure window without
  closing it, and logs every user in far more often to solve a problem
  none of them have.
- **Rotating `AUTH_SECRET`** — signs out every user on the site to reset
  one password.
- **Switching to database sessions** — not available while Credentials is
  a provider (`auth.ts:16-19`), and a far larger change than the problem
  warrants.

### Future

`sessionsValidAfter` is deliberately on `users` rather than owned by the
reset flow. A "sign out everywhere" control, or a password *change* while
logged in (out of scope for 033), is the same write to the same column and
should not need a second mechanism.

## References

- `specs/033-password-reset/research.md` #3 — the JWT finding in full
- `specs/033-password-reset/data-model.md` — column shape and the
  `iat`-granularity trap
- ADR 0005 (no hard deletes) — unaffected; nothing here deletes anything
