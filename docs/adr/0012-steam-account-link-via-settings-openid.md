# ADR 0012: Steam as a settings-time account link (OpenID), not a sign-in provider

**Status**: Accepted

**Date**: 2026-07-17

**Feature**: `038-steam-library-import`

## Context

We want a player to connect their Steam account and import their real game
library (feature 038), to make profiles and matching reflect what people
actually play rather than onboarding self-reports.

Two facts shape the design:

1. **Steam authenticates with OpenID 2.0**, not OAuth2/OIDC. Auth.js (our
   auth stack: v5, JWT sessions, Google + Credentials providers) has no
   first-class Steam provider, because Steam isn't an OAuth2 IdP.
2. **Steam supplies no email.** A Steam OpenID assertion yields only a
   SteamID64. This app's account model — email verification, password reset,
   notification email, the 18+ policy — is email-centric. An emailless
   account would need a materially different signup/model.

The tempting shape ("add Steam as another login provider like Google") runs
straight into (2): a Steam-only login has no email, so it reopens the whole
emailless-account problem.

## Decision

Integrate Steam as a **settings-time account link on an already-authenticated
account**, implemented as a **custom OpenID 2.0 handshake we own** — *not* an
Auth.js provider and *not* a way to sign in.

- **Connect happens from account settings**, on a player who is already signed
  in. The link attaches the verified SteamID to *that* session's user. Steam
  is never consulted to establish identity or a session.
- **The handshake is two route handlers + hand-rolled verification.** Initiate
  redirects to Steam's `checkid_setup`; the callback **verifies the returned
  assertion server-side** by posting it back with `mode=check_authentication`
  and requires `is_valid:true` before trusting the SteamID (Constitution
  Principle II — the return is attacker-controlled). No `openid` npm
  dependency; ~30 lines of explicit, tested logic.
- **The SteamID lives on `users`** (`steamId` unique, nullable, plus
  `steamConnectedAt`), not in Auth.js's adapter `account` table (that space is
  for OAuth providers, which this isn't). Unique ⇒ one Steam account links to
  at most one playm8z account.

**What makes this the right cut — the load-bearing distinctions:**

1. **It is not a login method.** You cannot sign in with Steam; you can only
   *link* Steam to an account you already hold. This is precisely what lets us
   avoid the emailless-account problem — the account already has an email,
   sign-in method, verification state, and age eligibility, none of which this
   feature touches.
2. **Ownership is proven, not asserted.** The OpenID round-trip proves the
   player controls the Steam account. The rejected "paste your SteamID/vanity
   URL" alternative proves nothing — anyone could import a stranger's library.
3. **It sits beside Auth.js, not inside it.** The JWT/session machinery, the
   session-revocation `jwt` callback (ADR 0010), and the two existing providers
   are untouched. A bug here cannot affect sign-in.

## Consequences

- **A second, narrow auth-adjacent surface exists** (the OpenID connect/verify
  handlers) parallel to Auth.js. Its trust boundary is explicit and tested
  (a forged/tampered assertion must yield no link). This is justified
  complexity, recorded in the plan's Complexity Tracking.
- **`STEAM_API_KEY` is a new server-only secret** (owned-games reads), added to
  `.env.example` and provisioned in Vercel prod once. Tests simulate Steam, so
  no key is needed locally or in CI.
- **Imported games are ordinary `userGames`** stored by free-text name — no
  `steamAppId` is stored anywhere, so ADR 0001's free-text model and ADR 0011's
  name-keyed image resolution both apply unchanged (an imported name lights up
  a curated image for free).
- **A door is opened, deliberately not walked through.** Sign-in-with-Steam,
  live "playing now" status, and using the Steam avatar are now *closer*
  (identity is linked and verifiable), but each remains its own future decision
  with its own ADR — none is implied by this one. Sign-in-with-Steam in
  particular still owes an answer to the emailless-account question before it
  could be built.

## Alternatives considered

- **Steam as an Auth.js provider / sign-in method.** Makes Steam a login,
  reopening the emailless-account problem (no email for verification/reset/
  notifications/age), and requires bending Auth.js around OpenID 2.0. Rejected
  — and explicitly deferred as separate future work.
- **Paste a SteamID or vanity URL (+ ResolveVanityURL).** No redirect, but
  proves no ownership — a player could link and import any stranger's library.
  Rejected on security (spec FR-001/FR-002).
- **An `openid`/`passport-steam` library.** Built for Express/Passport and
  NextAuth v4; a poor fit for App Router route handlers and an extra dependency
  to carry for a small, security-critical routine we'd rather own and test.
  Rejected.
- **Store the link in Auth.js's adapter `account` table.** Conflates a
  non-OAuth link with the provider-account space and invites the assumption
  that Steam is a login. Rejected in favour of explicit `users` columns.
