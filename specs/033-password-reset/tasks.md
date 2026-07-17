# Tasks: Password Reset

**Feature**: `033-password-reset` | **Plan**: [plan.md](./plan.md)

`[P]` = parallelisable with its neighbours. Phases are ordered by hard
dependency, not preference.

## Phase A — Schema

- [ ] **T001** Add `passwordResetTokens` to `src/db/schema.ts` per
      [data-model.md](./data-model.md): `id`, `userId` (FK → `user.id`,
      cascade), `tokenHash` (UNIQUE), `expires`, `usedAt` (nullable),
      `createdAt`. Index on `userId`.
- [ ] **T002** Add `users.sessionsValidAfter` (timestamp, **nullable**, no
      default). A default of `now()` would sign out every existing user at
      deploy — the migration must leave existing rows NULL.
- [ ] **T003** `npx drizzle-kit push`. If it prompts about a rename it will
      hang non-interactively — split into two unambiguous pushes. **Verify
      both landed by querying the DB directly**; a green exit code has
      silently no-op'd in this repo before.

## Phase B — Token core (the security lives here)

- [ ] **T004** `src/lib/auth/password-reset-token.ts`:
      `createPasswordResetToken(userId)` → `randomBytes(32).toString("hex")`
      raw, store SHA-256 only, `expires = now + 1h` (FR-008). Supersede
      prior outstanding tokens for that user with an **explicit write in
      the same transaction** — not by relying on read-time ordering
      (data-model.md: TOCTOU between concurrent requests).
- [ ] **T005** Same file: `redeemPasswordResetToken(rawToken)` → hash,
      look up by `tokenHash`, reject unless `usedAt IS NULL` **and**
      `expires > now()`. Mark `usedAt` on success. Return a single opaque
      failure for every rejection reason (FR-018).
- [ ] **T006** [P] Unit tests for T004/T005. Must include:
      - a valid token redeems **once**, and the second attempt fails (FR-010)
      - an expired token fails — with a **positive control** in the same
        test that the same token would have worked before expiry, or the
        test passes even if creation is broken
      - issuing a second token invalidates the first (FR-009)
      - a malformed/unknown token fails **identically** to an expired one
      - the raw token is **never** equal to any stored value (FR-012) —
        assert `tokenHash !== rawToken` and that the row's hash is the
        SHA-256 of the raw
      - **two concurrent issues** for one user leave exactly one valid
        token (the supersede race)

## Phase C — Emails (reuse the seam; do not add a second path)

- [ ] **T007** [P] `send-password-reset-email.ts` on `sendEmail()` +
      `appUrl()`, imitating `send-verification-email.ts`. Link →
      `/reset-password?token=<raw>`. Idempotency key on the **token**, not
      the user (a re-request must send; a retry must not double-send).
      HTML-escape the URL — the `&` between query params is an unterminated
      entity otherwise.
- [ ] **T008** [P] `send-password-reset-unavailable-email.ts` (FR-005) —
      the Google-only message. **Contains no link.** Test asserts the body
      has no `/reset-password` URL.
- [ ] **T009** [P] Unit tests for T007/T008: link points at the real site
      (not localhost), token is url-encoded, plaintext part present, failure
      returns rather than throws.

## Phase D — Validation & actions

- [ ] **T010** `src/lib/validations/password-reset.ts`. The new-password
      schema MUST **derive** from `credentialsSchema.shape.password`
      (FR-015) — restating `min(8)` creates two rules that can silently
      disagree. Add a test that fails if they ever diverge.
- [ ] **T011** `request-password-reset.ts` (Server Action):
      1. Zod-parse the address.
      2. **Decide the response first** — one value, all cases.
      3. Look up the user. No account → send nothing (FR-006). No
         `passwordHash` → T008's mail (FR-005). Otherwise → throttle check
         (a token created < 60s ago → skip send, silently), else T004 + T007.
      4. `logAuditEntry({ category: "access", actorId: null })`.
      Never branch the response on any of it (research.md #5).
- [ ] **T012** `complete-password-reset.ts` (Server Action): redeem (T005)
      → validate password (T010) → `bcrypt-ts` `hash(pw, 10)` **matching
      `register/route.ts:61`** → set `passwordHash`, `emailVerified`
      (FR-014), `sessionsValidAfter = now()` (FR-013) → audit. **Must not**
      sign the user in (FR-019). All DB writes in one transaction.
- [ ] **T013** Unit tests for T011. The enumeration battery — one test
      asserting the responses for **registered / unregistered / Google-only
      / throttled** are all **identical**, plus that a send happened in
      exactly the cases it should. This is FR-004's only real defence.
- [ ] **T014** Unit tests for T012: password actually changes; email marked
      verified (FR-014); `sessionsValidAfter` set; token consumed; **an
      unverified account can complete a reset** (research.md #7 — the
      instinct to gate this strands the exact users it's for); **a
      Google-only account never gains a `passwordHash`** through any path
      (research.md #8).

## Phase E — Auth callback (ADR 0010 — highest blast radius)

- [ ] **T015** `src/auth.ts`: `session`/`jwt` callback rejects a JWT whose
      `iat` precedes `users.sessionsValidAfter`. Floor both to whole
      seconds; **tie = invalid** (fail closed).
- [ ] **T016** Unit tests for T015, **both directions**:
      - a JWT issued before a reset is rejected
      - a JWT issued after is accepted
      - `sessionsValidAfter IS NULL` (every existing user) is **always**
        accepted — a bug here logs out the entire site at deploy
      - the same-second boundary is rejected
      A test that only proves "stale sessions die" also passes when *every*
      session dies. Pin the negative.

## Phase F — Screens

- [ ] **T017** `src/app/forgot-password/page.tsx` + `forgot-password-form.tsx`.
      **This is what kills the production 404** (FR-001). Success state is a
      dead end saying the same thing for every address — no "we sent it to
      that address" phrasing (FR-004). Match `auth-form.tsx`'s language and
      `guidelines.md` §4.6 submit/error states.
- [ ] **T018** `src/app/reset-password/page.tsx` + `reset-password-form.tsx`.
      Token from the query string. Invalid/expired/used/missing → one
      message + a link to start over (FR-018). On success → point at
      `/login`, do not auto-login (FR-019).
- [ ] **T019** [P] Component tests: form validation surfaces, pending state,
      error state, success state.

## Phase G — E2E (what unit tests structurally cannot prove)

- [ ] **T020** Full flow: request → read token **from the database** (never
      scrape the console log — that couples the test to a fallback that
      doesn't exist in production) → set new password → log in with it →
      confirm the **old** password now fails.
- [ ] **T021** Revocation, both directions (ADR 0010): two logged-in
      contexts, reset in one, the other loses access **on a read-only
      private page** (not just a write); and an **unrelated** account's
      session survives untouched.
- [ ] **T022** [P] The dead link is dead no more: `/forgot-password` returns
      200 and is reachable by clicking "Forgot password?" on `/login`.

## Phase H — Close out

- [ ] **T023** Remove password reset from `docs/future-work.md`'s
      "Not-yet-designed" list (it names `/reset`) — the list is only useful
      if shipped things leave it. Note the route is `/forgot-password`.
- [ ] **T024** Update 001's spec.md FR-015 with a pointer to 033, so the
      next reader of "the reset flow is a separate feature" can find it.
      001's research.md already carries the email retrospective.
- [ ] **T025** Full verification: typecheck, lint, Vitest, Playwright.
      **Cross-check the reporter's e2e count against `playwright test
      --list`** — a silent under-run is how a real failure escaped before.
