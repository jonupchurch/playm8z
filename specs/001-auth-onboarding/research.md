# Phase 0 Research: Auth & Onboarding

## 1. Transactional email provider (verification emails)

**Decision**: Resend (`resend/resend-email` on the Vercel Marketplace), the
only/top result for the `messaging` category via `vercel integration
discover --category messaging`, per the marketplace skill's rule to take
the top discover result when a need isn't in the preferred-provider table.

**Rationale**: Native Vercel Marketplace integration (auto env var
provisioning, unified billing), a Next.js-friendly SDK, and a free tier
sufficient for early-stage volume.

**Status: RESOLVED 2026-07-16 — provisioned and sending.** See feature
`033-transactional-email`. Kept below for the record.

> ~~**Status: provisioning blocked on domain ownership.**~~ Resend's Vercel
> Marketplace install requires a `domain` metadata value ("you must own a
> domain to be able to send" — there is no sandbox/testing sender available
> through this install path). The user does not yet own a domain (the
> custom domain question was separately deferred — see `status.md`). This
> is an external prerequisite outside this feature's control, not a design
> gap.

The blocker cleared when `playm8z.net` was registered (2026-07-14, for the
production deploy — not for this). Nothing connected the two, so the
console.log fallback stayed live in production for two days, meaning
**FR-013 was not actually met**: every Credentials sign-up was emailed
nothing, stayed unverified, and was therefore blocked by FR-014 from
posting, applying, or messaging. Google sign-ups were unaffected (they're
auto-verified), which is why nobody noticed.

Resend is now installed on `send.playm8z.net` (free plan, `us-east-1`),
verified, and sending. A subdomain rather than the apex, so the root's
single permitted SPF record stays free for a future mailbox.

**Fallback for implementation before a domain exists**: build the
verification-email step behind a small abstraction (e.g. a
`sendVerificationEmail(user, token)` function) that, when no email
provider is configured, logs the verification link to the server console
instead of sending a real email. This keeps the feature fully testable
(unit tests, e2e tests, local dev, even CI) without a real domain, and
becomes a one-line swap to the real Resend client once a domain exists
and the integration is provisioned. Tasks.md should include an explicit
"wire up Resend once a domain is available" task rather than assuming it
happens automatically.

**Retrospective on the two claims above (2026-07-16).** Both were wrong,
and worth recording because the shape recurs:

1. *"Tasks.md should include an explicit task..."* — it never got one. The
   sentence naming the risk was written; the task guarding against it
   wasn't. The safeguard against forgetting was itself forgotten, and this
   sat until the user asked after it. A follow-up recorded only in prose,
   in the research doc of a feature that then shipped, is not a follow-up.
2. *"...becomes a one-line swap"* — it didn't. It was three, and two were
   invisible until the swap was attempted:
   - Resend's SDK does not throw on API errors, it returns `{data, error}`.
     A `Promise<void>` wrapper swallows that and reports success by
     silence — the same invisible failure the stub had.
   - The link was built from `process.env.NEXTAUTH_URL ?? localhost`, and
     `NEXTAUTH_URL` was set **nowhere in the repo**. Always undefined,
     always localhost. The stub hid it perfectly: locally the fallback is
     correct, and in production nobody reads a console.log. Turning on real
     sending without fixing it would have delivered a working email
     containing a dead link. Now `src/lib/email/app-url.ts`, with the
     regression test that would have caught it.
   - The sender must sit on the *verified* domain exactly or Resend 403s,
     so it's derived from `RESEND_EMAIL_DOMAIN` rather than hand-set.

   The general lesson: a stub that "keeps the feature fully testable" tests
   the code around the seam, not the seam. Everything on the far side of it
   — env vars only production sets, an SDK's error contract — is exactly
   what no test was covering, and stays unexercised for as long as the stub
   is in place.

**Alternatives considered**: none — Resend was the only discover result
for `messaging`, and no other provider was named by the user.

## 2. How does a Google-authenticated new user get a handle?

The spec's sign-up form (Credentials path) collects a handle directly,
but Google OAuth sign-up skips that form entirely — yet every `User`
needs a unique, immutable handle (spec Key Entities).

**Decision**: prompt for a handle as part of onboarding Step 1 (Profile),
alongside display name, whenever the authenticated user doesn't already
have one — this covers both "first Google sign-in ever" and, defensively,
any account that somehow reached onboarding without a handle. The
Credentials sign-up form's Username field and this onboarding prompt
share the same validation (unique, letters/numbers only, starts with a
letter, ≤24 characters, immutable) and the same availability-check
endpoint.

**Rationale**: keeps Google's one-click appeal intact (no extra form
before the OAuth redirect) while still guaranteeing every account has a
handle by the time onboarding completes.

**Alternatives considered**: auto-generating a handle from the Google
profile's email local-part or display name — rejected, collision-prone
and produces impersonal/ugly default handles a user would likely want to
change immediately (and handles are immutable once set, so a bad
auto-generated default would be a real quality issue, not cosmetic).
Requiring handle entry before starting the Google OAuth redirect —
rejected, adds friction to the one-click flow that Credentials sign-up
doesn't have, and doesn't match the wireframe (which shows no handle
field for the Google path).

## 3. Where is the "unverified user" write-action gate enforced?

**Decision**: a single server-side check (not client-side-only) reused
across every write-action entry point (posting, applying, messaging,
forum posting/replying, etc. — as those features are built), reading the
session's `emailVerified` status already present on the `user` table.
Not implemented as Next.js middleware (middleware runs on every request
including reads, which this gate explicitly should not block per FR-014);
implemented as a per-action server-side check instead, alongside each
write action's own Zod validation (Principle II).

**Rationale**: this feature only needs to define the gate exists and
what it blocks (spec FR-014); the concrete mechanism belongs here since
it's an implementation pattern other future features (Post a Game, Inbox,
Forum) will reuse, not a UI/business-scope decision.

**Alternatives considered**: Next.js middleware blocking all
write-method requests — rejected, would need to special-case every read
route anyway (more complex than checking at each actual write action) and
middleware runs on the edge/before full request context is available in
some setups, adding complexity for no benefit here.
