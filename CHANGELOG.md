# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Scaffolded the Next.js app: App Router, TypeScript strict, Tailwind
  CSS, `src/` layout, npm.
- Zod, wired as the validation layer for trust boundaries (starting
  with the Credentials-provider auth input).
- Drizzle ORM against a local PostgreSQL database (`playm8z`, created on
  the local Postgres 15 instance): `src/db/schema.ts`, `src/db/index.ts`,
  `drizzle.config.ts`, `db:generate`/`db:migrate`/`db:studio` npm
  scripts. Initial migration applied (Auth.js's `user`/`account`/
  `session`/`verificationToken` tables, `user` extended with a
  `passwordHash` column for the native-login path).
- Auth.js v5 (`next-auth`) wired via `@auth/drizzle-adapter`: Google
  OAuth provider plus a native Credentials (email + password, hashed
  with `bcrypt-ts`) provider, JWT session strategy, route handler at
  `src/app/api/auth/[...nextauth]/route.ts`. Google client
  ID/secret are left as TODOs in `.env.local` — need to be created in
  the Google Cloud Console.
- Scaffolded the project with GitHub Spec Kit (Claude Code integration,
  PowerShell scripts, `.specify/` templates and workflow, matching the
  sibling project InterruptVector's setup).
- Drafted an initial project constitution (v0.1.0-draft, unratified) —
  process principles (spec-driven development, validated trust
  boundaries, designed/accessible UI, scope discipline, test
  discipline, legible history) structurally adapted from
  InterruptVector's constitution, with playm8z's own product scope left
  open pending `/speckit-specify`.
- Copied `.gitignore` from InterruptVector (committed standalone).
- Added three more wireframes to `resources/wireframes/`: "Post a Game"
  (listing-creation form), "Forum" (logged-in-only discussion board),
  and "Listing" (single LFG listing detail view) — alongside the
  existing Home and Browse wireframes and the Dark/Light theme + style
  guide comps.
- Added "Inbox" (messages) and "Profile" (user profile) wireframes, plus
  five admin CMS wireframes under `resources/wireframes/admin/`: Admin
  Forum (forum moderation), Admin News (news feed content editing),
  Admin Postings (posting/listing moderation), Admin Users (user
  management), and Admin Reports (user/content reports).
- Deferred "Groups" (persistent guilds/clans, distinct from one-off LFG
  listings) to `docs/future-work.md` — no wireframe was made for it, and
  it's explicitly out of scope for the first spec.
- Added six more wireframes: "Auth & Onboarding" (sign-in/sign-up plus a
  post-signup onboarding flow — what you play, where/how you play, your
  vibe), "Forum Thread" (single thread + replies), "News" (public news
  feed), "Content Page" (public rendering of an admin-editable page),
  and admin "Admin Content Pages" (CMS editor) and "Admin Dashboard".
  Also added `resources/wireframes/support/playm8z - Notifications &
  Report.dc.html` (notifications panel + content reporting flow).
- Added `resources/guidelines.md` — a Claude-Design-generated build
  guide tying the whole wireframe set together: product overview,
  design-system tokens, suggested data models, full route map, and a
  per-screen spec for every page. Expanded `docs/future-work.md` with
  its full "not-yet-designed" list (§10).
- Added `resources/sitemap.md` — a full site tree with access-level
  markers (public/authed/admin), global elements, and key page-to-page
  flows; cross-confirms guidelines.md's route map and surfaces a few
  more undesigned pages (public profile, news article detail, password
  reset), folded into `docs/future-work.md`.
- ADR 0001 (`docs/adr/0001-game-as-free-text-keyword.md`): `game` is a
  free-text/keyword field, not a curated catalog entity — no admin
  Games-management page, no per-game hub page. Supersedes
  `guidelines.md` §5's suggested `Game` entity/`gameId` foreign key.
- Added `resources/wireframes/support/playm8z - Error Pages.dc.html` —
  404, 500, 403, and a maintenance/down page.
- Added `resources/guidelines.md` §4.6 "Loading & error patterns" — a
  reusable design-system spec (not per-page wireframes) for skeleton
  loading, delayed-skeleton timing, a fetch-error state distinct from
  the existing Empty state, pending-submit buttons, and submit
  success/error, covering every data-fetching/mutating page at once.
  Resolves the open loading-states question in `docs/future-work.md`.
- Added `resources/wireframes/support/playm8z - Blocked Users.dc.html`
  — blocked-users list/search, block flow (pick → confirm, optional
  "also report"), unblock confirmation, empty states.
- ADR 0002 (`docs/adr/0002-minimum-age-18-plus.md`): playm8z is 18+
  only — the 13+ age tier is dropped; `ageGroup` is `18|21`, with 21+
  as an optional stricter tag rather than a platform minimum.
  Supersedes `guidelines.md` §5's `ageGroup(13|18|21)`.
- ADR 0003 (`docs/adr/0003-posting-30-day-expiration.md`): postings
  auto-expire 30 days after creation unless manually closed or renewed.
- Confirmed and logged several scope decisions in
  `docs/future-work.md`: post-session rating and monetized/premium
  accounts are explicit future-state features; notification emails are
  scoped to registration/verification only for now; email-verification
  design/implementation is delegated to Claude Code, pending an
  email-provider choice; recurring sessions are descriptive-only (no
  scheduling engine).
- ADR 0004 (`docs/adr/0004-roster-slots-are-generic.md`): no
  structured role-matching on roster slots — a posting's description
  and an applicant's message convey fit, not a role picker. Supersedes
  `guidelines.md` §5's `RosterSlot.role` as a structured field.
- Confirmed more scope decisions: Steam/Discord social login are both
  future state (only Google OAuth + Credentials are in scope); a
  posting auto-flips to `full` once all slots are accepted; blocking
  someone mid-conversation hides and freezes that conversation
  (reviewable by admins later) rather than deleting it; an admin
  user-activity viewer is future state; bans are permanent with
  appeals handled via Discord, not an in-app appeals queue.
- Resolved the logged-out marketing landing page: no bespoke design
  needed, it's just another `ContentPage` via the existing Content
  Pages system. Groups re-confirmed as future state.
- ADR 0005 (`docs/adr/0005-no-hard-deletes.md`): nothing is ever
  hard-deleted platform-wide — every delete-shaped action is a
  disable/soft-delete instead, generalizing the blocked-conversation
  and permanent-ban behaviors into one stated principle.
- Confirmed more scope decisions: hosts can remove an accepted roster
  member (freeing the slot); `reliabilityPct` is deferred to future
  state (no mechanism exists to compute it yet); a posting can't be
  edited once an applicant has been accepted; handle/username rules
  are unique, letters/numbers only, must start with a letter, max 24
  characters, and immutable once registered.
- Amended the constitution (v0.1.0-draft → v0.2.0-draft): Development
  Workflow now specifies a git branching rule (each feature on its own
  Spec-Kit-created branch, merged to `main` on completion, no PR review
  required for solo development) and a feature-granularity default
  (roughly one feature per wireframed page/screen, a strong default not
  a hard rule) to close feedback loops quickly and contain scope drift.
- Amended the constitution again (v0.2.0-draft → v0.3.0-draft):
  strengthened the "specify→plan→tasks before implementation" rule from
  a per-feature gate into a project-wide one — every currently-scoped
  feature's spec.md/plan.md/tasks.md must all be complete before
  implementation begins on any feature, not just before that feature's
  own implementation.
- Added `docs/feature-list.md` — tracks the ~22-26 proposed features
  (one per wireframed page, grouped by dependency order) against the
  project-wide spec/plan/tasks gate. Design System / shared UI
  primitives is exempt (infrastructure, built directly). Moved public
  profile, news article detail, Admin Settings, and Moderator audit log
  out of `docs/future-work.md`'s deferred list since the user is
  actively wireframing them now, not deferring them.
- Added five more wireframes: Public Profile, News Article, Admin
  Settings, Moderator Audit Log, and a Landing page. Reverses the
  earlier call that the logged-out landing page didn't need bespoke
  design — `playm8z - Landing.dc.html` is a real marketing page (hero,
  stats, three-step explainer, genre browse, testimonials, CTA), beyond
  what the block-based Content Page editor supports, so it's now its
  own feature. All five moved into `docs/feature-list.md`'s
  ready-to-spec list.
- `resources/guidelines.md`/`resources/sitemap.md` regenerated to fold
  in all 7 newly-wireframed pages (a new §12 "Additional screens"
  section, updated IA/route map and file→feature map). Confirmed:
  Public Profile's new scope (a Follow toggle, host-initiated "Invite
  to a party," a mutual-connections sidebar) is in scope. Re-added
  `guidelines.md` §4.6 (loading/error patterns), dropped by the
  regeneration since it wasn't sourced from a wireframe, with a note
  flagging it won't survive a future regen automatically.
- Linked the Vercel project (`jupchurch-7994s-projects/playm8z`) and
  provisioned Neon Postgres via the Vercel Marketplace
  (`vercel integration add neon`), connected to the project with
  `DATABASE_URL` and friends set for Production/Preview/Development.
  Pushed the Drizzle schema to Neon (`user`/`account`/`session`/
  `verificationToken` tables confirmed live). Set a fresh `AUTH_SECRET`
  on Vercel for Production and Preview. Local dev intentionally stays
  on local Postgres (not Neon); restored `.env.local` after the
  Marketplace install's automatic env pull overwrote it. Gitignored the
  Neon-integration's auto-installed Claude Code skills
  (`.claude/skills/neon*`, `.agents/`, `skills-lock.json`) since they're
  absolute-path symlinks that don't survive a clone to a different path.
- Configured Google OAuth (Google Cloud Console client, Testing publish
  status) and set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` locally and on
  Vercel (Production + Preview). Verified end-to-end that the sign-in
  flow correctly redirects to Google's real consent screen.
- First production deploy is live at `https://playm8z.vercel.app`.
  Registered its origin/redirect URI with the same Google OAuth client
  and verified the Google sign-in flow end-to-end in production too.
- Installed Vitest + Playwright, matching the sibling project's setup
  exactly. Added a real unit test suite for the Credentials-provider
  Zod schema (`src/lib/validations/auth.test.ts`, 4 passing tests) and
  a placeholder e2e smoke test (`e2e/smoke.spec.ts`) checking the home
  page loads. Both verified running. Amends the constitution
  (v0.3.0-draft → v0.3.1-draft, patch-level) to close out Principle V's
  "no test framework installed" note.
- Added `.github/workflows/ci.yml`: typecheck, lint, Vitest, and
  Playwright (against an ephemeral Postgres 15 service container) on
  every push and PR, using CI-only placeholder auth env vars (no real
  secrets, no GitHub Secrets setup needed). Verified the flow locally
  first (schema push + production build against a throwaway database
  with the same placeholders) before trusting it in Actions. Confirmed
  green on the first live GitHub Actions run.
- Synced the constitution's Technology Constraints with the actual
  Vercel/Neon/CI setup (it was still missing the deployment picture
  entirely) and closed out a stale reference to CI being unwired.
  v0.3.1-draft → v0.3.2-draft, patch-level.
- **Ratified the constitution: v1.0.0**, `RATIFICATION_DATE` 2026-07-12.
  Six amendments (branching rule, feature granularity, project-wide
  spec/plan/tasks gate, test-framework closure, technology-constraints
  sync) had already proven out through real work before ratification.
- Confirmed pulling the Design System / Brand Identity design-tool
  files into `resources/design/` — pending the user exporting them
  from the design tool, same as every other wireframe this session.
- Picked Auth & Onboarding as the first feature to run through
  `/speckit-specify` (foundational, blocks nearly everything else).
- Ran `/speckit-specify` for Auth & Onboarding: `spec.md` on branch
  `001-auth-onboarding`, quality checklist passed first try, zero
  `[NEEDS CLARIFICATION]` markers.
- Ran `/speckit-plan` for Auth & Onboarding: `research.md` (Resend
  picked as the email provider via Vercel Marketplace discover, though
  actual provisioning is blocked on domain ownership — a console-log
  fallback is planned instead so the feature is buildable now;
  resolved how Google sign-ups get a handle; resolved where the
  unverified-user write gate lives), `data-model.md` (extends the
  existing `user` table, no new tables beyond Auth.js's own
  `verificationToken`), `contracts/api.md`, `quickstart.md`. Discovered
  no git-branch-creation hook is actually configured in this repo
  despite the constitution assuming one — branches are created by hand.
- Ran `/speckit-tasks` for Auth & Onboarding: `tasks.md` — 40 tasks
  across Setup, Foundational, and the three prioritized user stories
  (P1 sign-up + onboarding, P2 login, P3 skip-onboarding), plus a Polish
  phase. Includes the reusable unverified-email write-action gate
  helper as its own task, since no consuming write-action route exists
  yet in this codebase to wire it into. Auth & Onboarding now has a
  complete spec/plan/tasks trio — first feature to clear the
  project-wide gate; implementation still waits on every other feature
  reaching the same point.

- Adopted a merge-back workflow for the spec-writing phase: each
  feature branch merges to `main` (no PR needed, solo project)
  immediately after its `spec.md`/`plan.md`/`tasks.md` are complete,
  rather than staying open until every feature is done. Keeps
  `docs/feature-list.md`/`status.md`/`CHANGELOG.md` coherent across the
  whole spec-writing marathon instead of fragmenting across ~26
  branches. Merged `001-auth-onboarding` into `main` under this rule.
- Ran `/speckit-specify` for Error Pages (404/500/403/maintenance):
  `spec.md` on branch `002-error-pages`. Four states (not-found,
  server-error, access-denied, maintenance) as one shared component per
  the source wireframe, prioritized by real-world frequency. Bakes in
  real HTTP status codes per state, an access-check-before-existence
  rule so unauthorized visitors can't distinguish a real vs. fake
  `/admin/*` route via 403 vs. 404, and defers the maintenance flag's
  storage/toggle UI to the not-yet-spec'd Admin Settings feature.
  Quality checklist passed first try, zero `[NEEDS CLARIFICATION]`
  markers.

- Ran `/speckit-plan` for Error Pages: reading `node_modules/next/dist/
  docs/` (per AGENTS.md's instruction to verify current API shape
  rather than assume it) surfaced Next.js 16's actual native mechanism
  — `not-found.tsx`, `error.tsx`/`global-error.tsx` (with auto-generated
  `error.digest` doubling as the spec's reference code), and
  `forbidden.tsx`/`unauthorized.tsx` behind `experimental.
  authInterrupts`. This is *why* spec.md's FR-008 was corrected
  (separate commit) before finishing the plan: Next.js already splits
  401 (not logged in) from 403 (wrong role) natively, both rendering
  the same shared page, which is more correct than the original
  single-403 requirement. Added a minimal `settings` table (data-model.md)
  for the maintenance flag — read-only for this feature, owned by the
  future Admin Settings feature — read via `proxy.ts` (Next 16's renamed
  `middleware.ts`) with a short-TTL cache rather than a DB hit per
  request.

- Ran `/speckit-tasks` for Error Pages: `tasks.md` — 23 tasks: Setup (1,
  the `authInterrupts` flag) → Foundational (5: settings table + its
  migration, cached settings reader, the shared 4-variant error-state
  component, the role-gate helper) → US1/P1 404 (3) → US2/P2 500 (4) →
  US3/P3 401/403 (4, unit-tested only — no real gated route exists yet
  to drive a live e2e test, same situation as Auth & Onboarding's
  write-gate helper) → US4/P4 maintenance (3) → Polish (3). Error Pages
  is the second feature to clear the project-wide gate.

- Ran `/speckit-specify` for Home: `spec.md` on branch `003-home`.
  Scoped down from the wireframe to just the hero/search/trending/
  live-feed content area — the nav/footer are Design System
  infrastructure (exempt per `docs/feature-list.md`), and the
  wireframe's "Groups" nav link doesn't apply (platform-wide deferred).
  Caught and simplified one scope risk before planning: the wireframe's
  "online" dot was originally going to need a real per-host presence/
  last-active system touching shared auth code — simplified to a
  decorative indicator tied to "posting is open" instead, since every
  card shown is already filtered to open postings. Quality checklist
  passed first try, zero `[NEEDS CLARIFICATION]` markers.
- Ran `/speckit-plan` for Home: `research.md` (client-side search/
  filter/sort over one server-side fetch per page load, no new API
  route; a new minimal `postings` table that Home defines and the
  future Post a Game feature will extend, same pattern as Auth &
  Onboarding/Error Pages; unauthenticated visitors at `/` redirect to
  `/login` until Landing exists; Trending computed via a live `GROUP
  BY` aggregate, never cached/stale), `data-model.md`, `quickstart.md`.
  No `contracts/` — no new fetch-based API surface.

- Ran `/speckit-tasks` for Home: `tasks.md` — 24 tasks: Setup (1, a
  local postings-seed script since Post a Game doesn't exist yet) →
  Foundational (4: postings table + migration, the open-postings
  reader, the page-shell redirect) → US1/P1 search+filter+sort+
  click-through (7) → US2/P2 trending (5) → US3/P3 empty state (4) →
  Polish (3). Home is the third feature to clear the project-wide gate.

- Ran `/speckit-specify` for Browse: `spec.md` on branch `004-browse`.
  Full faceted discovery, public (no auth required, unlike Home) —
  corrects the wireframe's Age group facet to 18+/21+ (ADR 0002) and
  reinterprets "Soonest" sort against Posting's `scheduledDate` field
  rather than the wireframe sample data's conflation with recency.
  Quality checklist passed first try, zero `[NEEDS CLARIFICATION]`
  markers.
- Ran `/speckit-plan` for Browse: `research.md` (server-side, URL-
  search-param-driven filtering instead of Home's client-side approach
  — Browse is the full/comprehensive surface, not a small recent slice;
  a debounced keyword field; relocating and extending Home's
  listing-card component into a shared location rather than
  duplicating it; Zod-validating every facet value before it reaches
  the query builder, since this is the first feature where visitor-
  controlled input shapes a real `WHERE` clause), `data-model.md`
  (extends `postings` with genre/ageGroup/timeSlots/platform/
  micRequired/scheduledDate), `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Browse: `tasks.md` — 22 tasks: Setup (1,
  extending Home's seed script) → Foundational (5: extended postings
  columns + migration, the searchParams Zod schema, relocating/
  extending the shared listing-card component, the faceted query
  builder) → US1/P1 search+filter+sort+click-through (7) → US2/P2 pills
  (3) → US3/P3 empty state (3) → Polish (3). Browse is the fourth
  feature to clear the project-wide gate.

- Ran `/speckit-specify` for Post a Game: `spec.md` on branch
  `005-post-game`. The listing-creation form, extending the shared
  `postings` table with its last fields (tags, recurring, voiceLink) —
  first feature to actually consume Auth & Onboarding's unverified-
  email write-action gate. Corrects Age group to 18+/21+ (ADR 0002);
  excludes "Save as draft" from scope (logged to
  `docs/future-work.md` — no draft state exists in the Posting model).
  Quality checklist passed first try, zero `[NEEDS CLARIFICATION]`
  markers.
- Ran `/speckit-plan` for Post a Game: `research.md` (a Server Action
  for publishing rather than an API route; game-suggestion quick-picks
  reuse the same most-common-games aggregate as Home/Browse instead of
  a hardcoded list; the live preview reuses the shared listing-card
  component rather than duplicating it; the Group size/Spots open
  relationship is re-validated server-side, never trusting client-side
  clamping alone), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Post a Game: `tasks.md` — 20 tasks: Setup
  (1, confirming the Auth & Onboarding gate dependency exists) →
  Foundational (5: extended postings columns + migration, the
  validation schema, the game-suggestion query, the page-shell
  redirect) → US1/P1 happy-path publish (6) → US2/P2 auth+verification
  gate (3) → US3/P3 validation guardrails (2) → Polish (3). Post a Game
  is the fifth feature to clear the project-wide gate.

- Ran `/speckit-specify` and `/speckit-plan` for Listing detail:
  `spec.md`/`plan.md` on branch `006-listing-detail`. Introduces
  `applications` and `questions` (this feature's first real writes),
  and derives the roster from the host plus accepted applications
  rather than a separate `RosterSlot` table — ADR 0004 already removed
  the only field (role) that table would have carried beyond what
  `applications` tracks. Drops the wireframe's per-slot role labels
  and all host mini-profile stats (rating/sessions/reliability/level —
  none computed anywhere yet). Defers accept/decline/remove-roster-
  member to Inbox/messaging, and Report/Save to `docs/future-work.md`.
  Second and third real consumer of Auth & Onboarding's unverified-
  email write gate; extends `Application.status` with a `withdrawn`
  value distinct from `declined`. Quality checklist passed first try,
  zero `[NEEDS CLARIFICATION]` markers. No `contracts/` — all writes
  are Server Actions.

- Ran `/speckit-tasks` for Listing detail: `tasks.md` — 27 tasks: Setup
  (1) → Foundational (5: new tables + migration, validation schemas,
  roster derivation, the page shell) → US1/P1 apply+withdraw (8) →
  US2/P2 Q&A (7) → US3/P3 capacity correctness (3) → Polish (3).
  Listing detail is the sixth feature to clear the project-wide gate.

### Known gaps
- No sign-in/sign-up UI — only the Auth.js machinery is wired up.
- No custom domain connected — deliberately deferred, live at
  `https://playm8z.vercel.app` only.
