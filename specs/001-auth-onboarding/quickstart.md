# Quickstart: Validating Auth & Onboarding

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up (`npm install`, local Postgres running,
`.env.local` populated — see `status.md`).

## Setup

```bash
npm run dev
```

No Resend configuration needed yet (research.md #1) — verification links
log to the server console until a domain exists.

## Scenario 1 — Sign up with email/password, complete onboarding

1. Visit `/signup`. Enter a handle, email, and an 8+ character password.
2. Submit — expect to land on onboarding Step 1 (Profile).
3. Check the server console for the logged verification link (no real
   email sent pre-domain).
4. Enter a display name, pick an avatar color, continue through all 4
   steps (games, region/platforms/age, vibe/slots).
5. Expect the completion screen, summarizing choices, with a working
   "Start browsing" action that lands on Home.
6. Confirm in the database (or via Drizzle Studio, `npm run db:studio`)
   that the new user row has `handle`, `name`, `region`, `ageGroup`,
   `vibe`, and `gamesPlayed` populated, and `emailVerified` is still null.
7. Visit the logged verification link — confirm `emailVerified` is now
   set.

## Scenario 2 — Skip onboarding

1. Sign up as in Scenario 1.
2. On Step 1, click "Skip for now" instead of continuing.
3. Expect to land on the completion screen immediately, then Home.
4. Confirm the user row has only `handle`/`name`/`email` populated (or
   whatever was entered before skipping) — no error, no forced retry.

## Scenario 3 — Return and log in

1. Log out (if signed in from a prior scenario).
2. Visit `/login`, enter the email/password from Scenario 1.
3. Expect to land directly on Home — no onboarding steps shown.
4. Try an incorrect password — expect a generic invalid-credentials
   message that doesn't reveal whether the email is registered.

## Scenario 4 — Google sign-up gets a handle

1. Sign up via "Continue with Google" with a Google account that has no
   playm8z account yet.
2. Expect onboarding Step 1 to include a handle field (in addition to
   display name/avatar) since Google sign-up doesn't collect one
   upfront (research.md #2).
3. Confirm `emailVerified` is already set immediately (no verification
   email sent for Google accounts).

## Scenario 5 — Unverified user is blocked from write actions

1. Sign up via email/password but don't visit the verification link.
2. Attempt a write action gated by this feature (post a listing, once
   that feature exists — or, if Post a Game isn't built yet, use
   whatever the earliest-available gated action is at implementation
   time).
3. Expect the action to be blocked with a message pointing at email
   verification, not a silent failure or generic error.

## Automated tests

- `npm test` — unit tests for the handle/onboarding-field Zod schemas
  (format rules, boundary lengths, enum membership).
- `npm run test:e2e` — Scenario 1 and Scenario 3 at minimum, as
  Playwright specs, replacing the current placeholder `e2e/smoke.spec.ts`
  once this feature has a real page to test against.
