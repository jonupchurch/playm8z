# Phase 0 Research: Error Pages

## 1. Next.js 16's actual App Router mechanism for these four states

AGENTS.md warns this Next.js version has real breaking changes from
training-data assumptions and to check `node_modules/next/dist/docs/`
before writing code. Doing so surfaced a fuller, more native mechanism
than assumed:

**Decision**:
- **404** — `app/not-found.tsx` alone is sufficient. Since v13.3.0, the
  root `not-found.js` already handles any unmatched URL app-wide; no
  need for the experimental `global-not-found.js` (`globalNotFound`
  flag), which exists for a different problem (multiple root layouts or
  a dynamic-segment root layout — neither applies here).
- **500** — `app/error.tsx` (a Client Component error boundary wrapping
  each route segment) plus `app/global-error.tsx` (catches failures in
  the root layout itself, which `error.tsx` can't reach) together give
  full coverage. Next.js auto-generates `error.digest`, a hash usable to
  correlate a user's report with server-side logs — this **is** the
  spec's reference code (FR-004); no custom ID generator needed. The
  newly-added (v16.2.0) `unstable_retry()` prop re-fetches/re-renders
  the failed boundary in place, a better "try again" than a manual page
  reload.
- **403 / 401** — `app/forbidden.tsx` (driven by calling `forbidden()`
  from `next/navigation`) and `app/unauthorized.tsx` (driven by
  `unauthorized()`) are the native mechanism, gated behind enabling
  `experimental.authInterrupts` in `next.config.ts`. Both files render
  the same shared visual component — satisfying the spec's "one look"
  requirement (FR-013) — while still returning the *correct* status per
  condition (401 vs. 403). This is why spec.md's original FR-008 (403
  for both cases) was corrected before finalizing this plan: Next.js
  already makes the correct split available for free, so building
  something less correct on top of it isn't a reasonable tradeoff.
  Neither function can be called from the root layout — not a real
  constraint here, since every check happens in a page, route handler,
  or Server Action, never the root layout.
- **Maintenance** — no dedicated Next.js file convention for this (it's
  a product concept, not a framework one). Implemented as a check in
  `proxy.ts` (Next 16's renamed `middleware.ts`) that runs ahead of
  every route except `/admin/*`, rendering the shared component's
  maintenance variant with a 503 status when the flag is on.

**Rationale**: Using the framework's own conventions rather than a
hand-rolled scheme means correct status codes, correct `<meta
robots>`/SEO behavior (handled automatically by `not-found`/`error`),
and no bespoke error-boundary code to maintain.

**Alternatives considered**: A single custom root error boundary
component manually setting response codes — rejected, since Next.js's
special-file conventions already do this more correctly (e.g., `error.
digest` for correlation, automatic `noindex` on 404) than a hand-rolled
equivalent would, for the same amount of code.

**Known caveat carried forward** (not a gap in this feature, but worth
recording for every *future* feature that calls `notFound()` from
inside an existing page): if a route's page has already started
streaming content back to the client (e.g., it has a `loading.tsx`
boundary) before calling `notFound()`, the response was already sent
with a `200` status — Next.js can't retroactively change it, though it
does mark the streamed 404 content `noindex` so it isn't indexed as a
real page. Next's own docs suggest checking existence in `proxy.ts`
*before* the response starts streaming, if a guaranteed 404 status
matters for a given route. This feature's own `app/not-found.tsx` isn't
affected (a truly unmatched URL never enters a page's render/streaming
pipeline in the first place), but it's worth flagging for later
features (Listing detail, Public Profile, News Article) that will call
`notFound()` for a missing record.

## 2. Where does the maintenance flag live before Admin Settings exists?

**Decision**: add one new minimal `settings` table now — a single row
with `maintenanceMode` (boolean, default false) and `maintenanceMessage`
(text, nullable) — rather than an environment variable. This feature
only reads it (data-model.md); the future Admin Settings feature
(`guidelines.md` §12.6) owns writing to it and will extend the same
table with its many other toggles (auto-flag rules, feature flags,
etc.) rather than this feature inventing a throwaway shape that gets
replaced later.

Read via `proxy.ts` on every non-admin request. Since proxy runs on
every route (including prefetches) and Next's own guidance is to keep
proxy checks fast and avoid per-request database work, the read is
wrapped in a short-TTL cache (a few seconds) rather than querying
Postgres on every single request — acceptable staleness for a flag that
changes rarely and deliberately (a planned maintenance window), not a
correctness issue.

**Interim manual toggle**: until Admin Settings ships a real UI, the
flag is flipped directly via `npm run db:studio` (Drizzle Studio) or a
raw SQL update — a manual/dev step, same pattern as Auth & Onboarding's
console-logged verification link standing in for a real email
provider.

**Rationale**: An environment variable was considered and rejected —
env var changes need a redeploy on Vercel, which defeats the point of
an admin being able to flip maintenance mode instantly; a DB-backed
flag (even read-only for now) is the real mechanism the eventual
product needs, so building it now avoids a second migration later.

**Alternatives considered**: environment variable (rejected above);
Vercel Edge Config (rejected — genuinely a good fit for this exact use
case, but pulls in a new storage product for one boolean + one string
when the project already has Postgres/Drizzle wired up everywhere
else; revisit if Admin Settings' full config surface ever outgrows a
single Postgres table).

## 3. Where does the reusable role-gate helper get used?

**Decision**: build `src/lib/auth/require-role.ts`, a small helper
wrapping `forbidden()`/`unauthorized()` with a minimum-role check
against the session, ready for future gated pages (most notably the
not-yet-built `/admin/*` pages, which the sitemap already marks
"role ≥ moderator") to call. No real gated page exists yet in this
codebase to consume it — same situation as Auth & Onboarding's
unverified-email write-gate helper (research.md #3 there): the
mechanism is this feature's job to define and build; a *future*
feature's pages are what will actually call it.

**Rationale**: keeps the 401/403 decision point in one place rather
than every future gated page re-implementing its own role check.

**Alternatives considered**: waiting to build this until the first real
gated page (Admin Dashboard) needs it — rejected, since the reusable
helper is small, is exactly what this feature's own User Story 3 needs
to be independently testable (via a synthetic test route), and avoids
the first admin feature having to also design this mechanism from
scratch.
