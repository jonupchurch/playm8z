# Implementation Plan: Password Reset

**Branch**: `033-password-reset` | **Spec**: [spec.md](./spec.md)

## Summary

Fill in the flow behind the login form's "Forgot password?" link, which has
been a live 404 in production since 001 shipped it deliberately empty
(001/FR-015). Two screens, two emails, one new table, one new column, one
sitewide auth change (ADR 0010).

The dependency that actually blocked this — transactional email — landed
earlier today, so this feature consumes `sendEmail()`/`appUrl()` and adds
no new email machinery.

## Technical Context

**Language/Runtime**: TypeScript, Next.js App Router (this repo's version
diverges from training data — consult `node_modules/next/dist/docs/` before
writing route/page code, per AGENTS.md).

**Storage**: Postgres via Drizzle. Schema changes are applied with
`drizzle-kit push`, **not** `db:migrate` (which silently no-ops here).
Production reconciles itself: `vercel-build` runs `drizzle-kit push`.

**Auth**: Auth.js v5, JWT strategy (`src/auth.ts:19`), `@auth/drizzle-adapter`.

**Email**: Resend via `src/lib/email/send-email.ts` (shipped 2026-07-16).

**Testing**: Vitest (unit, `fileParallelism: false`) + Playwright (e2e,
`workers: 1`).

## Constitution Check

| Principle | Status |
|---|---|
| I — Spec-driven & legible; ADR for real tradeoffs | **Pass.** spec/plan/research/data-model/tasks committed. The session-revocation tradeoff is ADR 0010 rather than buried in research.md, because it changes the whole app's auth path. |
| II — Validate at trust boundaries | **Pass.** Both entry points are public and unauthenticated — the widest boundary in the app. Zod on both; the new-password schema *derives* from `credentialsSchema` (FR-015) rather than restating `min(8)`. |
| III — Tests prove behaviour | **Pass, with teeth.** The security requirements (FR-004 enumeration, FR-011 token confusion, FR-018 fail-closed) are exactly the kind that pass vacuously if tested carelessly, so tasks.md pins each with a test that fails on the obvious wrong implementation. |
| IV — Scope discipline | **Pass.** Password *change* while logged in, MFA, and magic links stay out. `sessionsValidAfter` lands on `users` (not owned by this flow) because a future "sign out everywhere" is the same write — that's shaping, not building, for later. |
| V — No hard deletes (ADR 0005) | **Pass.** Tokens are marked `usedAt`, never deleted. |
| VI — Legible history | **Pass.** FR-017 records request and completion via the existing `logAuditEntry()`. |

## Approach

### Phase A — Schema (blocks everything)

`passwordResetTokens` table + `users.sessionsValidAfter`, per
[data-model.md](./data-model.md). Two **separate unambiguous pushes** if
drizzle-kit shows any rename prompt — a prompt is unanswerable
non-interactively and has silently no-op'd before. Verify columns landed by
querying the DB directly, never by trusting the command's exit code.

### Phase B — Token core (pure, heavily tested)

`src/lib/auth/password-reset-token.ts`: create (random 32 bytes → raw for
the link, SHA-256 → stored), and redeem (hash incoming → look up → validate
→ mark used). Supersede prior tokens with an **explicit write at issue
time**, not by relying on `ORDER BY createdAt` at read time (data-model.md:
that's a TOCTOU race between concurrent requests).

No I/O beyond the DB; no email, no Next.js. This is where the security
lives, so it's the layer that gets exhaustive unit tests.

### Phase C — Emails

Two senders on the existing seam, imitating `send-verification-email.ts`:

- `send-password-reset-email.ts` — the link. Idempotency key on the **token**
  (a re-request mints a new token and must actually send; a retry of the
  same send must not double-deliver — same reasoning as verification's).
- `send-password-reset-unavailable-email.ts` — the Google-only message
  (FR-005), containing **no link**.

### Phase D — Server actions

- `request-password-reset.ts` — the enumeration-critical one. Decide the
  response **first**, then do the work; never branch the response on the
  outcome (research.md #5). Silent throttle (research.md #4).
- `complete-password-reset.ts` — validate token, hash new password
  (`bcrypt-ts`, cost 10, matching `register/route.ts:61`), set
  `emailVerified` (FR-014) and `sessionsValidAfter` (FR-013), mark token
  used. **Must not** sign the user in (FR-019).

Both `logAuditEntry({ category: "access" })`. `actorId` is null on request
— there's no authenticated actor, which is why that column is nullable.

### Phase E — Auth callback (ADR 0010)

`session`/`jwt` callback compares JWT `iat` against `sessionsValidAfter`,
floored to seconds, tie = invalid.

**This touches every authenticated request on the site.** Highest-blast-radius
change in the feature: a mistake here logs everybody out, or logs nobody
out and silently voids FR-013. Tested both directions explicitly.

### Phase F — Screens

`/forgot-password` (request) and `/reset-password` (redeem, token in query).
No wireframe exists — match the existing Auth & Onboarding screens and
`guidelines.md` §4 / §4.6. Reuse the `auth-form.tsx` visual language.

The request screen's success state must be a **dead end** that says the same
thing regardless (FR-004) — no "check your inbox at that address" phrasing
that implies the address was found.

### Phase G — E2E

The flows that unit tests structurally cannot prove: the real link works,
the old password stops working, a stale session actually loses access.
Locally there's no `RESEND_API_KEY`, so the send logs instead — the e2e must
obtain the token from the **database**, not by scraping a log.

## Risks

| Risk | Why it's real here | Mitigation |
|---|---|---|
| **The enumeration leak returns quietly.** | FR-004 and FR-020 actively conflict; the *helpful* implementation of a throttle ("try again in 42s") is exactly the tell. Nothing fails if it leaks. | A test that submits registered / unregistered / Google-only / throttled and asserts all four responses are byte-identical. |
| **A test passes vacuously.** | Burned before in this project: a test "passed" because a prior run had left state behind. Security tests are the worst case — "reset refused" passes if the whole feature is broken. | Every negative test paired with a positive control proving the mechanism works when it should. |
| **The auth callback logs everyone out.** | A `NULL` backfilled as `now()`, or a tie treated as valid/invalid wrongly, hits 100% of users at deploy. | `NULL` = never revoked, asserted; explicit same-second boundary test; e2e proves an untouched session survives. |
| **`drizzle-kit push` silently no-ops.** | Documented prior failure in this repo. | Verify columns exist by querying the DB, not by exit code. |
| **The reset gets gated on verification.** | The natural instinct is to require a verified email; that strands exactly the users the feature exists for (research.md #7). | Explicit test: unverified account can complete a reset. |

## Project Structure

### Documentation (this feature)

```
specs/033-password-reset/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/requirements.md
docs/adr/0010-session-revocation-via-sessions-valid-after.md
```

### Source Code

```
src/
├── app/
│   ├── forgot-password/page.tsx          # new (kills the 404)
│   └── reset-password/page.tsx           # new
├── components/auth/
│   ├── forgot-password-form.tsx          # new
│   └── reset-password-form.tsx           # new
├── lib/
│   ├── auth/password-reset-token.ts      # new -- the security core
│   ├── actions/request-password-reset.ts # new
│   ├── actions/complete-password-reset.ts# new
│   ├── email/send-password-reset-email.ts             # new
│   ├── email/send-password-reset-unavailable-email.ts # new
│   └── validations/password-reset.ts     # new (derives from credentialsSchema)
├── auth.ts                               # modified -- ADR 0010 callback
└── db/schema.ts                          # modified -- table + column
```

## Complexity Tracking

One deviation from "simplest thing that works", taken deliberately:

**Session revocation costs a DB read per authenticated request sitewide.**
The free alternative (piggyback on the existing `requireAuth()` read) covers
writes only and leaves private reads open for up to 30 days. Presented to
the user with the cost named; they chose correctness. Recorded in ADR 0010
so the cost is discoverable by whoever finds it in a profile later.
