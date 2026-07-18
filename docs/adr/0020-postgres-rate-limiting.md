# ADR 0020: Rate-limit the auth entry points with a Postgres fixed-window counter

**Status**: Accepted

**Date**: 2026-07-18

**Feature**: n/a (security hardening; Tier 2 of the deep-scan follow-up)

## Context

A deep code audit found no rate limiting anywhere on the authentication surface: `authorize` (Credentials
login) in `src/auth.ts`, `POST /api/auth/register`, and `requestPasswordReset`. Nothing throttled repeated
attempts, so credential stuffing and account-enumeration probing were feasible at scripted speed. `bcrypt`
cost 10 slows a single password check but is not a throttle.

Two backends were considered for a limiter that must be correct across serverless instances (in-memory
counters are per-instance and don't hold on Vercel/Fluid Compute):

- **Upstash Redis** (`@upstash/ratelimit`, via the Vercel Marketplace) — purpose-built sliding-window
  limiter with TTL auto-expiry. Adds a new integration, a provisioning step, and another vendor.
- **The existing Neon Postgres** — a small counter table and an atomic upsert. No new vendor, no
  provisioning, durable and consistent across instances. Auth-endpoint volume is low, so the added DB load
  is negligible.

## Decision

1. **Rate-limit with a Postgres-backed fixed-window counter.** A `rateLimitHits` table holds one row per
   `(bucket, windowStart)`; `checkRateLimit(bucket, limit, windowMs)` (`src/lib/rate-limit/`) increments the
   current window atomically via `INSERT … ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`, and
   sweeps that bucket's rolled-over windows on each call so the table stays at ~one row per active bucket
   without a cron. `windowStart` is always an explicit app-computed JS `Date` (never `defaultNow()`), so the
   postgres.js timestamp-skew gotcha does not apply.

2. **Key by client IP, not by account.** An IP limit throttles a brute-forcing/enumerating source without
   letting an attacker lock a *victim* out by hammering their email address (which per-account keying would
   allow). The IP is the first `x-forwarded-for` entry (Vercel sets it at the edge; a client can't strip it),
   `x-real-ip` as fallback. When there is no real forwarded IP — local dev, the Playwright e2e suite, CI —
   the limiter is skipped entirely, so tests don't pile into one shared bucket and throttle the run.
   Production traffic always carries a forwarded IP, so it is always limited.

3. **Fail open.** If the limiter's own DB access errors, the request is allowed. The ambiguous case is
   legitimate users trying to log in; a transient limiter failure must not lock everyone out.

4. **Limits** (per IP): login 20 / 15 min, register 10 / hour, password-reset 10 / hour. On the reset path
   the throttle returns the *same* identical response as every other branch, so it never becomes a new way to
   tell whether an address has an account ([FR-004], ADR-adjacent to the reset design).

## Consequences

- The three auth entry points are throttled in production with no new infrastructure, vendor, or cost.
- This also blunts the register account-enumeration oracle that is otherwise accepted as a UX tradeoff (see
  `docs/future-work.md`) — scripted mass enumeration is now rate-limited.
- One extra DB round-trip per auth attempt (an upsert + a cheap bucket sweep). Negligible at auth volumes.
- The limiter is deliberately invisible to the local/e2e/CI environments, so its behavior is covered by
  direct unit/integration tests of `checkRateLimit` and `clientIp` rather than through the auth flows.

## Alternatives considered

- **Upstash Redis / `@upstash/ratelimit`** — rejected for now: better at scale and gives sliding windows and
  TTL cleanup for free, but adds a vendor, a provisioning step, and cost for a site whose auth volume is tiny.
  If auth traffic ever grows enough that the per-attempt Postgres write matters, this is the upgrade path.
- **Per-account (per-email) keying** — rejected as the primary key: it enables a victim-lockout DoS. Could be
  *added alongside* IP keying later (block if either exceeds) if targeted brute-force against single accounts
  becomes a concern; IP keying covers the common case without the lockout downside.
- **In-memory counter** — rejected: not shared across serverless instances, so it doesn't actually limit.
