# Implementation Plan: Auth & Onboarding

**Branch**: `001-auth-onboarding` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-onboarding/spec.md`

## Summary

Sign-in/sign-up UI on top of the already-built Auth.js v5 machinery
(Google OAuth + Credentials), plus a 4-step onboarding wizard that every
new account goes through once, and email verification for
Credentials-signed-up accounts gating write actions until confirmed.
Technical approach: extend the existing `user` table with onboarding
fields (no new tables needed beyond what Auth.js's adapter already
provides), add four small API routes, and build the wizard as ordinary
App Router pages/components — no new infrastructure required.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router), `next-auth` (Auth.js)
v5, `@auth/drizzle-adapter`, `drizzle-orm` + `drizzle-kit`, `zod`,
`bcrypt-ts`, React 19, Tailwind CSS 4 — all already installed, no new
runtime dependencies except the Resend SDK once a domain exists
(research.md #1)

**Storage**: PostgreSQL via Drizzle ORM — local Postgres for dev, Neon
Postgres (Vercel Marketplace) for Production/Preview

**Testing**: Vitest (unit/integration, jsdom + Testing Library) and
Playwright (e2e) — both already installed and CI-enforced

**Target Platform**: Web, deployed on Vercel (Fluid Compute/Node.js
runtime), responsive layout (no dedicated mobile app)

**Project Type**: Web application — single Next.js project (no
separate frontend/backend split)

**Performance Goals**: derived from spec Success Criteria — SC-001
(full onboarding <2min), SC-002 (skip-to-home <30s), SC-003
(login-to-home <15s excluding credential entry time)

**Constraints**: Zod validation at every new trust boundary (Principle
II); every state designed per `resources/guidelines.md` §4.6 (loading,
pending-submit, error) since none of these forms exist yet; WCAG 2.1 AA
(Principle III); age-group options limited to 18/21, never 13 (ADR
0002); no hard deletes anywhere this feature touches (ADR 0005, not
directly exercised here but noted)

**Scale/Scope**: solo/early-stage project, no concurrent-user target
yet; ~7 screens/states (login, signup, 4 onboarding steps, completion)
plus 4 new API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Spec-Driven Development & Legible Architecture | PASS. This plan follows spec.md; no new ADR needed — the two real decisions surfaced during planning (email provider, Google-user handle collection) are implementation-scoped and captured in research.md, not cross-cutting architecture calls like ADRs 0001-0005. |
| II. Validated Trust Boundaries | PASS, with action: every new endpoint (register, check-handle, verify-email, onboarding) validates its input with Zod before use, matching the existing `credentialsSchema` pattern. |
| III. Designed, Accessible Experience | PASS, with action: this is the first feature to actually apply `resources/guidelines.md` §4.6's loading/pending/error patterns, since no prior feature has built real forms yet. WCAG AA applies to all new forms/wizard steps. |
| IV. Scope Discipline | PASS. Feature boundary is exactly spec.md; password reset, Steam/Discord, and account-linking are explicitly out and logged, not silently built. |
| V. Test Discipline | PASS, with action: unit tests for every new Zod schema (handle, onboarding fields); integration tests for the register/onboarding routes actually persisting to Postgres (an explicit example of the "seam with real risk of silent breakage" Principle V names); e2e coverage for the primary sign-up+onboarding and login flows, replacing the placeholder smoke test. |
| VI. Legible History | Applies at `tasks.md`/implementation time — each task maps to an atomic, Conventional-Commits-prefixed commit. |

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-onboarding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── api.md            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # new
│   │   ├── signup/page.tsx          # new
│   │   └── onboarding/page.tsx      # new — 4-step wizard + completion screen
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # existing, unmodified
│   │   │   ├── register/route.ts          # new
│   │   │   ├── check-handle/route.ts      # new
│   │   │   └── verify-email/route.ts      # new
│   │   └── onboarding/route.ts             # new
├── auth.ts                            # existing; small profile() tweak on
│                                       # the Google provider (data-model.md)
├── db/
│   ├── schema.ts                      # extended: handle + onboarding
│   │                                   # columns on `user` (data-model.md)
│   └── index.ts                       # existing, unchanged
├── lib/
│   ├── validations/
│   │   ├── auth.ts                    # existing, extended with a
│   │   │                               # register/handle schema
│   │   └── onboarding.ts              # new — per-field + per-step schemas
│   └── email/
│       └── send-verification-email.ts  # new — Resend-backed, console-log
│                                        # fallback pre-domain (research.md #1)
├── components/
│   └── auth/
│       ├── auth-form.tsx              # new — shared login/signup form
│       └── onboarding-wizard.tsx      # new
tests/ (colocated, per existing convention)
├── src/lib/validations/auth.test.ts        # existing
├── src/lib/validations/onboarding.test.ts  # new
e2e/
├── smoke.spec.ts                       # existing placeholder, superseded
├── signup-onboarding.spec.ts           # new — Scenario 1/2 from quickstart.md
└── login.spec.ts                       # new — Scenario 3 from quickstart.md
```

**Structure Decision**: single Next.js project, no frontend/backend
split — matches the existing repo layout exactly. New work is additive
(new routes, new components, extended schema/validations); nothing in
the existing structure is reorganized.

## Complexity Tracking

*No violations — table intentionally empty.*
