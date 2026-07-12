<!--
Sync Impact Report
==================
Version change: 0.1.0-draft → 0.2.0-draft
Status: DRAFT — not yet ratified. Awaiting explicit user review/approval
  before RATIFICATION_DATE is set and this becomes v1.0.0.
Modified principles: n/a
Added principles: n/a (no new Core Principles this amendment)
Added sections: n/a (expanded existing Development Workflow section only)
Modified sections: Development Workflow — added a git branching rule
  (each feature developed on its own Spec-Kit-created branch, merged to
  `main` on completion, no PR-review step required for solo development)
  and a feature-granularity default (cut features roughly one-per-
  wireframed-page/screen where practical, to close feedback loops fast
  and contain scope drift per Principle IV — a strong default, not a
  hard rule).
Removed sections: n/a
Provenance note: this constitution's PROCESS (the six principles' shape,
  the ADR/changelog/status.md discipline, the spec-kit phase order) was
  structurally adapted from the sibling project InterruptVector
  (D:\Codelib\InterruptVector), which itself traces the same lineage back
  through a project called PrintingSite. Per Principle I below and
  InterruptVector's own Governance section, this is a starting point for
  process, not inherited authority or product content — none of
  InterruptVector's product-specific rules (its sandboxed-code-execution
  principle, its tank-battle MVP scope) are carried over, since playm8z
  is a different product with its own scope still to be defined.
Still open, deliberately left as TODOs below:
  - What playm8z actually is (problem statement, MVP scope) — Principle
    IV's discipline rule is ratified; its content is largely captured
    informally in `resources/guidelines.md`, `status.md`, and
    `docs/adr/`, pending a formal `/speckit-specify` run per feature.
  - Whether a test framework (Vitest/Playwright, matching the sibling
    project) gets adopted — noted as a gap in Technology Constraints,
    not yet installed.
  - RATIFICATION_DATE, pending explicit user approval of this draft.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate is
     generic (no hardcoded principle names), compatible as-is.
  ✅ .specify/templates/spec-template.md — compatible.
  ✅ .specify/templates/tasks-template.md — compatible.
-->

# playm8z Constitution

## Core Principles

### I. Spec-Driven Development & Legible Architecture (NON-NEGOTIABLE)

The constitution, spec, plan, and tasks are first-class artifacts: they
MUST be committed to the repository (never gitignored) and MUST be kept
genuinely in sync with the code — not written once and abandoned. Every
non-trivial decision with a real tradeoff (data model, auth provider,
storage choice, third-party integration) MUST be captured in a short
Architecture Decision Record (ADR, `docs/adr/`) before or alongside the
code that implements it. The README MUST read as a guided tour: problem
→ spec excerpt → key architectural decisions (linking ADRs) → how to
run.

Rationale: a documented process is how the reasoning behind non-obvious
calls stays legible to future-Jon (and to any collaborator), rather than
being reconstructed from git archaeology later.

### II. Validated Trust Boundaries (NON-NEGOTIABLE)

All data crossing a trust boundary — form submissions, API request
bodies, query params, OAuth/credentials-provider callbacks, environment
configuration read at startup — MUST be validated with Zod before use;
nothing crosses that boundary as an unchecked `any`/`unknown`. Auth MUST
never trust client-reported identity: session/user state is established
server-side via Auth.js against the database (Drizzle/Postgres), and
authorization checks happen server-side on every request that needs
them, not just in UI conditionals. Passwords for the native-login
(Credentials) path are never stored or logged in plaintext — only a
bcrypt hash.

Rationale: this is this project's analog to InterruptVector's sandboxing
principle — narrower in scope (no untrusted user-submitted code here),
but the same underlying idea: input this app didn't produce itself is
adversarial by default until proven otherwise, and Zod plus
server-side auth checks are the concrete mechanism, not a slogan.

### III. Designed, Accessible Experience

The UI MUST have a distinctive visual identity — not default Tailwind,
not stock component-library defaults; `resources/design/` (dark/light
theme comps) and `resources/wireframes/` (page layouts) are the source
of truth for that identity. Every state MUST be designed: empty,
loading, error, and the auth flows
(sign-in, sign-up, sign-out, auth error) specifically. The
accessibility **target** is WCAG 2.1 AA — keyboard operability, visible
focus, semantic landmarks/roles, AA contrast. Automated axe checks
SHOULD run in CI once a test framework is in place; this is a goal to
aim for and close on, not a hard merge-blocking gate on day one.

Rationale: a portfolio-grade app is judged on finish as much as
function; a real design source (`resources/`) already exists, so this
principle keeps implementation honest to it instead of drifting to
generic component defaults.

### IV. Scope Discipline (NON-NEGOTIABLE)

One vertical slice done excellently beats a broad, half-built product.
Once a feature's `spec.md` MVP boundary is approved via
`/speckit-specify`, it is frozen for that feature; any new idea surfaced
mid-build MUST be logged to `docs/future-work.md` or an ADR instead of
being implemented, unless the spec is formally amended.
Infrastructure-only setup (project scaffold, auth/db wiring, spec-kit
itself) is built immediately as a stated exception, since it isn't
product surface.

Rationale: this is a structural discipline, not a product decision —
what playm8z's actual MVP scope is remains undefined until
`/speckit-specify` defines it; this principle just guarantees that once
it is defined, it holds.

### V. Test Discipline

Unit, integration, and e2e tests are expected for every non-trivial
feature. Every non-trivial unit of business logic MUST have unit tests
before its task is considered done. Integration tests MUST cover seams
that carry real risk of silent breakage (an API route persisting to and
reloading from Postgres, an auth callback creating/linking a user
record). CI MUST run typecheck, lint, and test on every push, and MUST
be green before merge.

Rationale: coverage of logic that silently breaks correctness matters
more than ceremony around write-order; strict test-first isn't
mandated, but the coverage itself is the expected default, not an
aspiration.

Current gap: no test framework is installed yet (this initial scaffold
covers app/db/auth wiring only) — adding one (Vitest + Playwright,
matching the sibling project's proven pattern, or an alternative) is
open and should happen before or alongside the first real feature.

### VI. Legible History

Commits MUST use Conventional Commits prefixes (`feat`, `fix`, `docs`,
`test`, `chore`, `refactor`) and each commit MUST be one logical,
atomic, self-contained change, mapped to a `tasks.md` item where
practical. After each unit of work, `CHANGELOG.md` and `status.md` MUST
be updated to match (and any ADR the work triggered MUST be written or
updated), and the result committed — not left staged for later. Trivial
changes (typo fixes, formatting) don't need a `CHANGELOG.md`/`status.md`
entry, but still get committed.

Rationale: legible history is how anyone (solo or not) safely picks
this back up later, and keeps `status.md`/`CHANGELOG.md` a trustworthy
live read of where things stand rather than a document perpetually
behind the actual code.

## Technology Constraints

Next.js (App Router) with TypeScript in strict mode; Tailwind CSS for
styling; npm as the package manager; `src/` layout with the `@/*` import
alias. Validation at every trust boundary uses Zod (Principle II).
Persistence is PostgreSQL (local dev via a locally installed Postgres
server), queried through Drizzle ORM (`drizzle-orm` + `drizzle-kit`,
schema at `src/db/schema.ts`, migrations in `drizzle/`). Auth is Auth.js
v5 (`next-auth`) via `@auth/drizzle-adapter`, with two providers: Google
OAuth and a native Credentials (email + password, hashed with
`bcrypt-ts`) provider; because Credentials sessions can't be looked up
through adapter-backed database sessions, sessions use the JWT
strategy. `.env.local` (gitignored) holds real secrets; `.env.example`
(committed) documents every required variable with no real values.

No test framework is installed yet (see Principle V's noted gap).

## Development Workflow

Spec Kit phases are worked in order: constitution → spec → plan → tasks
→ implement. Clarifying questions are asked before each major artifact
is generated. Decisions with a real tradeoff are presented as 2–3
options with pros/cons and a recommendation, rather than silently
decided. Every feature MUST be fully specified, planned, and tasked
before implementation begins on it — infrastructure-only setup (this
initial scaffold, or a future de-risking spike) is the stated exception,
built immediately since it isn't product surface — unless the project
owner explicitly asks to implement something sooner.

Each feature is developed on its own git branch — created automatically
by Spec Kit's `/speckit-specify` branch-creation hook — and merged into
`main` once that feature's tasks are complete. Because this is
currently solo development, merges do not require a pull-request review
step, but still land as a real merge into `main` rather than accumulating
commits directly on `main` once a feature is underway. Non-feature work
(documentation, ADRs, wireframes, constitution/spec-kit process files)
continues to commit straight to `main`, since it isn't itself product
surface.

Features are cut **granularly** — as close to one feature per wireframed
page/screen as practical — rather than bundling multiple pages into one
feature. This is a strong default, not a hard rule: the goal is fast
spec→plan→tasks→implement feedback loops and containing scope drift, per
Principle IV (Scope Discipline). Deviate when pages are tightly coupled
enough that splitting them would be artificial — justify the deviation
inline when it happens.

## Governance

This constitution supersedes all other project practices. Amendments
require a documented Sync Impact Report (prepended to this file)
recording the version change, modified/added/removed sections, and any
templates flagged for follow-up.

Constitution versioning follows semantic versioning:
- **MAJOR**: backward-incompatible governance or principle removals/
  redefinitions.
- **MINOR**: a new principle or section added, or materially expanded
  guidance.
- **PATCH**: clarifications, wording, or non-semantic refinements.

Every `/speckit-plan` run MUST include a Constitution Check gate against
the principles above, and every `tasks.md` MUST be traceable back to
them. Any complexity that appears to violate a principle — especially
Principle IV (Scope Discipline) — MUST be justified in the plan's
Complexity Tracking table or rejected.

Reference material from the sibling project InterruptVector
(`D:\Codelib\InterruptVector`) — its spec-driven workflow, ADR habit,
test-discipline language, and changelog/status.md conventions — was
used as a structural starting point for this constitution's process,
but MUST NOT be treated as this project's own authored decisions or as
a source of product content: per Principle I, this project's committed
ADRs, specs, and plans are authored (or substantively reconciled)
through this project's own process, so the "process produced this"
record stays genuine.

**Version**: 0.2.0-draft (DRAFT — not yet ratified) | **Ratified**:
TODO(RATIFICATION_DATE) — pending explicit user approval | **Last
Amended**: 2026-07-12
