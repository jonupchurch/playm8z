# Phase 1 Contracts: Auth & Onboarding

New API surface this feature introduces, alongside the existing Auth.js
route handler (`src/app/api/auth/[...nextauth]/route.ts`, unmodified
except a small `profile()` mapping tweak on the Google provider to carry
through Google's own `email_verified` claim — see data-model.md).

## `POST /api/auth/register`

Credentials sign-up. Creates a new account.

**Request body**: `{ handle, email, password }`

**Success (201)**: account created, a verification-token row created, a
verification email sent (or console-logged pre-domain, per research.md
#1). Response does not include the password hash or the raw token.

**Errors**:
- `400` — validation failure (malformed email, password < 8 chars, handle
  fails format rules) — response identifies which field failed.
- `409` — email or handle already taken.

## `GET /api/auth/check-handle?handle=<value>`

Live availability + format check, used by both the sign-up form and the
onboarding Step 1 fallback prompt (research.md #2) as the user types.

**Success (200)**: `{ available: boolean, reason?: string }` — `reason`
populated only when `available` is `false` due to a format violation
(distinct from "taken"), so the client can show a specific message.

## `GET /api/auth/verify-email?token=<value>&email=<value>`

Consumes a verification-token row and sets `user.emailVerified`.

**Success (200)**: redirects to a confirmation state (client detail, not
fixed here).

**Errors**:
- `400` — token missing/malformed.
- `410` — token expired or already used.

## `POST /api/onboarding`

Persists onboarding answers — called once per step as the user advances
(not just once at the end), so a skip at any point has already saved
everything entered up to that step (FR-012).

**Request body** (all fields optional per call — only the current step's
fields are expected, but the endpoint accepts a partial patch of any
subset): `{ handle?, name?, avatarColor?, gamesPlayed?, region?, platforms?, ageGroup?, vibe?, playTimeSlots? }`

**Success (200)**: updated fields persisted; response echoes the current
full profile state so the client can render the completion screen's
summary without a second round-trip.

**Errors**:
- `400` — a provided field fails its validation rule (data-model.md).
- `401` — no authenticated session (all onboarding endpoints require the
  user to already be signed in — onboarding only ever follows a
  successful sign-up).

## Notes

- No contract changes to the existing `/api/auth/[...nextauth]` routes
  (login, Google OAuth redirect/callback, session, csrf, signout) — those
  are already built and working (verified in earlier sessions against
  both local and production).
- These are business-level contracts (request/response shape, status
  codes, error cases) for planning purposes — exact route implementation
  (validation wiring, error response body shape conventions, etc.) is a
  `tasks.md`-level concern, not fixed here.
