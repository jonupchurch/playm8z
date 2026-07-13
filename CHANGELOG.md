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

- Ran `/speckit-plan` for Profile + Account settings: `research.md`
  (four real routes sharing a layout, not the wireframe's single-page
  client tabs; password-change re-verification; deactivation/
  reactivation touches `src/auth.ts`, the second feature to do so
  after Auth & Onboarding's Google `profile()` callback; email changes
  reuse Auth & Onboarding's verification-email helper; posting edits
  reuse Post a Game's validation schemas rather than duplicating them),
  `data-model.md` (extends `user` with `bio`/`createdAt`/four privacy
  booleans/`deactivatedAt`; new `userGames` and `savedListings`
  tables), `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Profile + Account settings: `tasks.md` — 35
  tasks: Setup (1) → Foundational (4: extended `user` + new tables,
  validation schemas, shared layout) → US1/P1 edit profile+games+
  password+email (13) → US2/P2 manage own postings (5) → US3/P3 saved
  listings (2) → US4/P4 privacy+deactivate (7) → Polish (3). Profile is
  the seventh feature to clear the project-wide gate — the largest
  feature specced so far.

- Ran `/speckit-specify` and `/speckit-plan` for Blocked Users:
  `spec.md`/`plan.md` on branch `008-blocked-users`. Introduces
  `blocks` and `reports` (first writer of the latter, via the "Also
  report" checkbox — no review/queue UI, that's Notifications &
  Report's job). Drops the wireframe's fake per-block reason taxonomy
  down to a simple report flag. This project's first real modal-dialog
  UI (focus trap, `role="dialog"`, Escape-to-close). Defines the Block
  relationship as a queryable entity; enforcing it elsewhere (Home,
  Browse, Listing detail, future Inbox/Forum) is explicitly out of
  scope and noted as a follow-up those features' docs may need.
  Quality checklist passed first try, zero `[NEEDS CLARIFICATION]`
  markers. No `contracts/`.

- Ran `/speckit-tasks` for Blocked Users: `tasks.md` — 20 tasks: Setup
  (1) → Foundational (5: new tables + migration, validation schemas,
  candidate search, a link added to Profile's Account page) → US1/P1
  view+search+unblock (6) → US2/P2 block-new (5) → Polish (3). Blocked
  Users is the eighth feature to clear the project-wide gate.

- Ran `/speckit-plan` for Forum index: `research.md` (categories as a
  hardcoded const, not a table; server-side URL-driven filtering,
  Browse's pattern, since threads accumulate indefinitely; HOT computed
  at read time rather than a stored/scheduled-job flag, distinct from
  the real moderator-controlled PINNED column; New Thread modal follows
  Blocked Users' established dialog-accessibility pattern),
  `data-model.md` (new `forumThreads` table), `quickstart.md`. No
  `contracts/`.

- Ran `/speckit-tasks` for Forum index: `tasks.md` — 22 tasks: Setup
  (1) → Foundational (5: new table + migration, category const,
  validation schemas, the search query) → US1/P1 browse+search+
  filter+sort (8) → US2/P2 create-thread (5) → Polish (3). Forum index
  is the ninth feature to clear the project-wide gate.

- Ran `/speckit-specify` and `/speckit-plan` for Forum Thread:
  `spec.md`/`plan.md` on branch `010-forum-thread`. Reading a thread is
  public; replying, liking, reporting, and subscribing are all gated.
  Models likes as a real per-user relationship with a database-level
  unique constraint (not just an app-level check, to close a race
  condition), second writer of Blocked Users' `reports` entity
  (`targetType='forum'`), drops the wireframe's fake "TOP REPLY"/
  best-answer badge (keeping the real "Top" by-likes sort), and
  Subscribe stores a preference only since no notification-delivery
  mechanism exists yet. Quality checklist passed first try, zero
  `[NEEDS CLARIFICATION]` markers. No `contracts/`.

- Ran `/speckit-tasks` for Forum Thread: `tasks.md` — 28 tasks: Setup
  (1) → Foundational (5: new tables + migration, validation schemas,
  the thread-read query, view-count increment) → US1/P1 read+sort (7)
  → US2/P2 reply+quote (5) → US3/P3 like+report (7) → Polish (3). Forum
  Thread is the tenth feature to clear the project-wide gate.

- Ran `/speckit-plan` for Inbox / messaging: `research.md` (lazy
  Conversation creation avoids amending Listing detail's already-merged
  apply flow — a pending Application's own message stands in as the
  request thread's opener; no websocket layer, a short
  `router.refresh()` poll instead, logged as future work; accepting a
  request is one atomic transaction across Application/Posting/
  Conversation; first real consumer of Blocked Users' block-enforcement
  contract), `data-model.md` (new `conversations`/`messages` tables),
  `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Inbox / messaging: `tasks.md` — 31 tasks:
  Setup (1) → Foundational (5: new tables + migration, validation
  schemas, the merged-list query, the authenticated layout) → US1/P1
  read+send (9) → US2/P2 start-conversation (6) → US3/P3 accept+
  decline (7) → Polish (3). Inbox / messaging is the eleventh feature
  to clear the project-wide gate.

- Ran `/speckit-plan` for Notifications + Report modal: `research.md`
  (`createNotification()` ships with no callers wired up yet, same
  pattern as `require-verified-email.ts`/`require-role.ts`; Accept/
  Decline reuses Inbox's existing transaction directly rather than a
  parallel implementation; the report flow writes into Blocked Users'
  existing `reports`/`blocks` tables, giving `reports.reason` its first
  real values; Blocked Users'/Forum Thread's existing simpler report UI
  are left as optional follow-up polish), `data-model.md` (new
  `notifications` table), `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Notifications + Report modal: `tasks.md` —
  25 tasks: Setup (1) → Foundational (5: new table + migration,
  validation schemas, the notification-creation helper, the filtered/
  grouped read query) → US1/P1 view+filter+mark-read (9) → US2/P2
  accept+decline reuse (2) → US3/P3 report-flow (5) → Polish (3).
  Notifications + Report modal is the twelfth feature to clear the
  project-wide gate.

- Ran `/speckit-specify` and `/speckit-plan` for News feed:
  `spec.md`/`plan.md` on branch `013-news-feed`. Entirely read-only for
  `NewsPost` — a minimal shape, extended later by the future Admin News
  feature (Home's `postings` pattern). Server-side, URL-driven
  filtering/pagination (Browse/Forum's pattern). Newsletter subscribe
  requires no authentication — the project's first write action with
  no session check at all, just email validation and a database-level
  unique constraint; no real sending pipeline (Forum Thread's
  `ThreadSubscription` precedent, blocked on the same domain-ownership
  issue as Auth & Onboarding's transactional email). Quality checklist
  passed first try, zero `[NEEDS CLARIFICATION]` markers. No
  `contracts/`.

- Ran `/speckit-tasks` for News feed: `tasks.md` — 19 tasks: Setup (1,
  a local news-post seed script) → Foundational (4: new tables +
  migration, validation schemas, the featured/filter/pagination query)
  → US1/P1 browse+filter+search+paginate (6) → US2/P2 subscribe (5) →
  Polish (3). News feed is the thirteenth feature to clear the
  project-wide gate.

- Ran `/speckit-specify` and `/speckit-plan` for Content Page:
  `spec.md`/`plan.md` on branch `014-content-page`. A slug-based public
  page block-rendered from a single JSONB column (not a normalized
  per-block table, since blocks are always read/written together).
  First real consumer of Error Pages' `require-role.ts`. Batched
  local-state editing (matching the wireframe exactly) — one atomic
  save per edit session, not per-keystroke. A draft page is
  indistinguishable from a nonexistent slug for non-admin visitors,
  both hitting Error Pages' 404. Scopes page creation out entirely to
  the future Admin Content Pages feature. Quality checklist passed
  first try, zero `[NEEDS CLARIFICATION]` markers. No `contracts/`.

- Ran `/speckit-tasks` for Content Page: `tasks.md` — 21 tasks: Setup
  (1, incl. a seed page covering every block type) → Foundational (4:
  new table + migration, the block schema, the page shell) → US1/P1
  public-read (4) → US2/P2 inline-edit (5) → US3/P3 publish+unpublish
  (4) → Polish (3). Content Page is the fourteenth feature to clear
  the project-wide gate.

- Ran `/speckit-plan` for Admin Dashboard: `research.md` ("Active
  today" redefined as timestamp-derived cross-table activity, not
  presence tracking; Needs-attention/Open-reports reuse the existing
  `reports` table grouped by `targetType`, no new auto-flag system;
  `AuditEntry`/`logAuditEntry()` ship with no real callers since the
  admin features that would generate entries aren't spec'd yet; Top
  games reuses Home's/Browse's established aggregate pattern),
  `data-model.md` (new `auditEntries` table plus a full read-only
  aggregate-query inventory), `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Dashboard: `tasks.md` — 24 tasks:
  Setup (1) → Foundational (3: new table + migration, the gated page
  shell) → US1/P1 KPIs+chart+top-games (10) → US2/P2 needs-attention+
  activity (7) → Polish (3). Admin Dashboard is the fifteenth feature
  to clear the project-wide gate.

- Ran `/speckit-plan` for Admin Users: `research.md` (Ban-only, no
  Delete — direct reuse of Profile's already-made Deactivate/Delete
  resolution; "Flagged" computed from existing `reports` rows, never
  stored; content removal adds `removedAt` to `postings`/`forumThreads`
  with small, bounded amendments to Home's/Browse's/Forum index's
  existing read queries, since a moderation-remove action with no
  visible effect would ship a no-op), `data-model.md`, `quickstart.md`.
  No `contracts/`.

- Ran `/speckit-tasks` for Admin Users: `tasks.md` — 27 tasks: Setup
  (1) → Foundational (4: schema extensions + migration, validation
  schemas, the gated page shell) → US1/P1 view+search+filter (6) →
  US2/P2 ban+unban (4) → US3/P3 drawer+content-removal (9, incl. the
  bounded Home/Browse/Forum-index amendments) → Polish (3). Admin Users
  is the sixteenth feature to clear the project-wide gate.

- Ran `/speckit-plan` for Admin Postings: `research.md` (severity
  computed, never stored, from the worse of report-reason severity and
  a new fixed auto-flag-reason taxonomy; a small deterministic
  auto-flag ruleset added to Post a Game's `create-posting.ts` rather
  than seeding decorative-only auto-flags; a new minimal `warnings`
  table, first-feature-defines-the-shape; `reports.status`'s first
  real `open`→`resolved` transition, no speculative `dismissed` value;
  this feature's own actions as `logAuditEntry()`'s first real
  callers, plus two retroactive bounded fixes closing gaps `015`/`016`
  left behind), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Postings: `tasks.md` — 31 tasks: Setup
  (1) → Foundational (4: schema extensions + migration, validation
  schemas, the gated page shell) → US1/P1 view+filter queue (6) →
  US2/P2 drawer+approve+remove (7) → US3/P3 warn+ban (6) →
  cross-feature amendments (4: bounded fixes to `005`'s
  `create-posting.ts`, `016`'s ban/remove-content actions, and `015`'s
  dashboard KPI queries) → Polish (3). Admin Postings is the
  seventeenth feature to clear the project-wide gate.

- Ran `/speckit-plan` for Admin Forum: `research.md` (classifying a
  `reports.targetType='forum'` row against `forumThreads` then
  `forumReplies`, since `010` never added a discriminator column;
  extracting shared `reason-severity.ts`/`auto-flag-rules.ts` helpers
  out of Admin Postings' `017` inline copies, correcting a wireframe-
  vs-ratified-taxonomy severity mismatch along the way; generalizing
  `017`'s `warnings.postingId` to a polymorphic `targetType`/`targetId`
  pair, the exact trigger `017`'s own research anticipated; "actioned
  today" as the first live read of `015`'s `auditEntries` rather than
  a new counter; locking a thread enforced server-side in `010`'s
  `post-reply.ts`), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Forum: `tasks.md` — 41 tasks: Setup
  (1) → Foundational (6: schema extensions incl. `017`'s `warnings`
  generalization, two shared moderation helpers, validation schemas,
  the gated page shell) → US1/P1 view+filter queue (8) → US2/P2
  drawer+approve+remove (7) → US3/P3 lock+warn+ban (8) →
  cross-feature amendments to `009`/`010` (4) → retroactive amendments
  to `017` (4) → Polish (3). Admin Forum is the eighteenth feature to
  clear the project-wide gate.

- Ran `/speckit-plan` for Admin Reports: `research.md` (grouping the
  queue by reported target rather than one row per report; a generic
  Dismiss action versus Remove/Warn delegating to `017`'s/`018`'s
  existing resolution actions for postings/forum, reused rather than
  reimplemented; profiles/messages as the first real mover for two
  target types with no prior dedicated queue; "total reports" as a
  computed cross-source aggregate, not a stored counter; retroactively
  adding `reports.resolvedAt` to `017`/`018`; correcting the shared
  `reason-severity.ts`'s `impersonation` mapping from medium to high,
  a one-place fix flowing to all three moderation features at once;
  extracting `classify-forum-target.ts` out of `018`), `data-model.md`,
  `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Reports: `tasks.md` — 37 tasks: Setup
  (1) → Foundational (6: schema extensions, the extracted
  classification helper, the severity correction, validation schemas,
  the gated page shell) → US1/P1 view+filter grouped queue (6) →
  US2/P2 dismiss+remove (9) → US3/P3 warn+ban (6) → cross-feature
  amendment to `011` (2: new `messages.removedAt` and its query
  exclusion) → retroactive amendments to `017`/`018` (4) → Polish (3).
  Admin Reports is the nineteenth feature to clear the project-wide
  gate.

- Ran `/speckit-plan` for Admin News: `research.md` (one `save-news-
  post.ts` action branching by requested action rather than five
  near-identical Server Actions; reusing `013`'s existing `featured`
  column for "pin," enforced exclusive via one transaction; scheduled-
  post publication computed at read time in `013`'s amended
  `search-news.ts`, no cron job, same reasoning as posting
  auto-expiry/ADR 0003; `body` as plain markdown with a snippet-
  inserting toolbar, not a rich-text editor; "Update" never resets
  `publishedAt`), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin News: `tasks.md` — 26 tasks: Setup
  (1) → Foundational (4: schema extensions, validation schemas, the
  gated page shell) → US1/P1 view+filter list (6) → US2/P2 editor+
  publish+schedule+draft (5) → US3/P3 pin+delete (5) → cross-feature
  amendment to `013` (2) → Polish (3). Admin News is the twentieth
  feature to clear the project-wide gate.

- Ran `/speckit-plan` for Admin Content Pages: `research.md` (reusing
  `014`'s `toggle-page-status.ts` directly for Publish/Unpublish
  rather than a second implementation; `system` as a real stored
  column, not derived, since page classification isn't recoverable
  from other data; seeding the three system pages now since no
  feature had ever written a `ContentPage` row before; human-legible
  unique-slug generation for "+ New page"; the small-bounded-list
  search/filter pattern, matching Admin News rather than Browse),
  `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Content Pages: `tasks.md` — 25 tasks:
  Setup (1) → Foundational (5: schema extension, the system-page seed,
  validation schemas, the gated page shell) → US1/P1 view+search+
  filter (6) → US2/P2 publish+unpublish+create (6) → US3/P3 delete
  (4) → Polish (3). Admin Content Pages is the twenty-first feature to
  clear the project-wide gate.

- Ran `/speckit-plan` for Public Profile: `research.md` (six wireframe
  elements reconciled against already-established decisions rather
  than built; a real, computed "sessions" proxy stat from existing
  applications/postings data; "Invite to a party" reusing `006`'s
  `applications` via a new `initiatedBy` discriminator rather than a
  parallel invite system, with bounded amendments to `011` reversing
  who's authorized to accept/decline; `follows` as a new, simple,
  hard-deletable relation; mutual-connections/shared-games computed
  at read time, never stored; `reviews` shipping display-only with no
  writer, matching the Notification/AuditEntry precedent),
  `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Public Profile: `tasks.md` — 28 tasks: Setup
  (1) → Foundational (4: new tables, `applications.initiatedBy`,
  validation schemas, the public page shell) → US1/P1 view profile
  (5) → US2/P2 follow+message+invite (10, incl. the bounded `011`
  amendments) → US3/P3 in-common+report+block (5) → Polish (3).
  Public Profile is the twenty-second feature to clear the
  project-wide gate.

- Ran `/speckit-plan` for News Article detail: `research.md` (a
  small markdown-to-HTML renderer, since `020` already committed to
  plain-markdown `body`; adding the `newsPosts.slug` neither `013` nor
  `020` ever needed, generated once at creation and immutable
  afterward, mirroring handle immutability; computed read time
  instead of the never-populated `readTimeMinutes`; Like as `010`'s
  third polymorphic-`likes` consumer; Save as a deliberately separate
  new table rather than a premature `SavedListing` generalization,
  since only two total consumers exist against this project's
  "generalize at three" bar; "Keep reading"/subscribe reusing `013`
  directly), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for News Article detail: `tasks.md` — 28 tasks:
  Setup (1) → Foundational (5: schema additions, the markdown-
  rendering dependency, validation schemas, the public page shell) →
  US1/P1 read article (5) → US2/P2 like+save (7) → US3/P3 keep-
  reading+share (4) → cross-feature amendments to `013`/`020` (3) →
  Polish (3). News Article detail is the twenty-third feature to
  clear the project-wide gate.

- Ran `/speckit-plan` for Admin Settings: `research.md` (extending
  `002`'s singleton settings table rather than a new one, exactly as
  that feature's own spec reserved; computed auto-hide-after-N-
  reports rather than a stored flag needing manual un-hide logic;
  `auto-flag-rules.ts` reading settings instead of hardcoded
  constants, closing the loop `017` explicitly anticipated;
  auto-escalate severity as a display badge, never an automated ban;
  a bounded 4-tier role extension with `support`/`viewer` shipping
  with no differentiated permissions yet; "Invite a team member" as
  direct assignment against an existing account, no parallel invite-
  token system; a real gap found and fixed — Public Profile, `022`,
  never honored Profile's, `007`, existing privacy toggles; one real
  feature flag, "Open signups," the other five stored-but-inert),
  `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Admin Settings: `tasks.md` — 43 tasks:
  Setup (1) → Foundational (6: schema extensions, validation schemas,
  the admin-only gated page shell) → US1/P1 general+maintenance (7)
  → US2/P2 moderation+auto-flag (11, incl. three families of bounded
  amendments to `017`/`018`/`019`/`003`/`004`/`009`) → US3/P3 roles+
  features+safety (15, incl. the `001`/`022` amendments) → Polish
  (3). Admin Settings is the twenty-fourth feature to clear the
  project-wide gate.

- Ran `/speckit-plan` for Moderator audit log: `research.md` (the
  category badge showing the real 4-value `category` rather than a
  fabricated 11-way classifier derived from free-text action strings;
  dropping the wireframe's hashed-IP meta example rather than adding
  new IP-capture infrastructure; a third real gap found and fixed —
  Admin News/Admin Content Pages never wired `logAuditEntry()`;
  Today/Yesterday/Earlier day-grouping; CSV export mirroring the
  active filter exactly), `data-model.md`, `quickstart.md`. No
  `contracts/`.

- Ran `/speckit-tasks` for Moderator audit log: `tasks.md` — 21 tasks:
  Setup (1) → Foundational (2: validation schemas, the moderator-
  gated page shell) → US1/P1 browse+search+filter (6) → US2/P2
  expand+export (4) → US3/P3 close the `020`/`021` logging gap (5) →
  Polish (3). Moderator audit log is the twenty-fifth feature to
  clear the project-wide gate.

- Ran `/speckit-plan` for Landing page (the 26th and final feature):
  `research.md` (a real "open parties right now" stat replacing the
  fake "online now" one; a real floating hero listing card with an
  honest empty-state fallback; three real trust-bar stats instead of
  four, dropping the unbacked average-rating number; a new
  `applications.acceptedAt` field powering "parties formed this
  week"; reworded feature-grid copy no longer overstating deferred
  reliability/ratings capabilities; testimonials kept as the one
  deliberate, explained exception to this project's no-fake-data
  discipline; closing the exact root-route loop Home's, `003`, own
  spec left open), `data-model.md`, `quickstart.md`. No `contracts/`.

- Ran `/speckit-tasks` for Landing page: `tasks.md` — 19 tasks: Setup
  (1) → Foundational (3: schema addition, the shared stats query) →
  US1/P1 real marketing page (7) → US2/P2 CTA navigation (2) → US3/P3
  real hero-card data (3) → Polish (3). Landing page is the
  twenty-sixth and FINAL feature to clear the project-wide gate.

## 🎉 Project-wide constitutional gate closed (2026-07-12)

All 26 features tracked in `docs/feature-list.md` now have a complete
`spec.md`/`plan.md`/`tasks.md` trio, merged to `main`. Implementation
may begin on any/all of them per the constitution (v1.0.0).

### Known gaps
- No custom domain connected — deliberately deferred, live at
  `https://playm8z.vercel.app` only.
- Real Resend transactional email still blocked on domain ownership —
  verification emails log to the server console instead.

## [Unreleased] (cont.)

### Added
- Added `resources/design/Brand Identity - playm8z.dc.html` — the
  brand-exploration trail (three initial directions, a WCAG contrast
  pass, a three-way merge, then "Turn 4 — LOCKED") landing on **Warm
  Pop** as the locked identity, with full dark and light mockups.
  Reconciled against `guidelines.md` §4: zero discrepancies found —
  every token, gradient, type-scale value, component pattern, and
  accessibility rule already there matches the locked file exactly. No
  `guidelines.md` changes needed. The interactive theme-switching
  `playm8z - Design System.dc.html` is still not delivered, but it
  would only restate the same tokens already confirmed live in the
  Dark Theme/Light Theme sheets, so it's no longer a blocker.
- Added `plan.md` — a plain-English TL;DR of all 26 features, numbered
  to match `docs/feature-list.md`/`specs/NNN-.../`.

## [Unreleased] (cont. 2)

### Added
- **Implemented Auth & Onboarding** (first feature built post-gate):
  sign-up/login UI on the existing Auth.js v5 machinery (Google OAuth +
  Credentials), the 4-step onboarding wizard (profile, games,
  where/how, vibe) with a completion screen, live handle-availability
  checking, email verification with a console-log fallback ahead of
  real Resend provisioning, and a reusable `requireVerifiedEmail()`
  write-action gate (FR-014) ready for future features to call. Wired
  in the actual Warm Pop design tokens/fonts (`globals.css`,
  `layout.tsx`) as the first feature needing real UI. Extends `users`
  with `handle`/`avatarColor`/`region`/`platforms`/`ageGroup`/`vibe`/
  `playTimeSlots`/`gamesPlayed`. 45 unit/integration tests (including
  two real-Postgres route tests) and 4 Playwright e2e specs (two with
  axe-core scans, which caught and fixed two real accessibility
  findings) all passing; `e2e/smoke.spec.ts` retired as superseded.
  All 40 tasks in `specs/001-auth-onboarding/tasks.md` checked off.

## [Unreleased] (cont. 3)

### Added
- **Implemented Error Pages**: branded 404/500/403/401/maintenance
  states on Next.js 16's native mechanisms (`not-found.tsx`,
  `error.tsx`+`global-error.tsx` using `error.digest`/`unstable_retry()`,
  `forbidden.tsx`+`unauthorized.tsx` behind `experimental.authInterrupts`),
  all sharing one `error-state.tsx` component. New read-only `settings`
  table backs the maintenance flag (manual toggle via `db:studio`/SQL
  until Admin Settings ships a real one), read through a 5-second cache
  and short-circuited in a new `proxy.ts` that exempts `/admin/*`.
  `require-role.ts` is built and unit-tested, though honestly forbids
  everyone above "user" rank for now since `users.role` doesn't exist
  until Admin Settings adds it. 58 unit/integration tests and 7 e2e
  tests (3 with axe-core scans) passing. Caught and fixed two real bugs
  via a full `next build` (not just dev mode): `/maintenance` was
  statically prerendering and freezing its message, and a
  deliberately-throwing e2e test route failed the build outright for
  the same reason — both fixed with `force-dynamic`. Also fixed a real
  e2e test-isolation bug (`maintenance.spec.ts` mutating shared global
  state raced with other parallel specs) by setting Playwright to a
  single worker. All 23 tasks in `specs/002-error-pages/tasks.md`
  checked off.

## [Unreleased] (cont. 4)

### Added
- **Implemented Home**: `/` redirects unauthenticated visitors to
  `/login` and otherwise renders the real search-first discovery page
  — hero, a client-side-filtered search bar + Vibe/Region chips + sort
  over one server-fetched list of open postings (no new API route), a
  recalculated-per-load Trending row, and an empty state linking to
  Post a Game's future `/post` route with the search term carried
  over. New minimal `postings` table (`getOpenPostings()` joins `users`
  for the host's real name/avatar); a new `npm run db:seed-postings`
  dev script stands in until Post a Game exists. 78 unit/integration
  tests and 10 e2e tests (4 with axe-core scans) passing. Caught and
  fixed a real WCAG AA contrast bug (bold 11px magenta text on a
  magenta-tinted pill background measured 4.32:1, short of the 4.5:1
  required — bold alone doesn't reach WCAG's relaxed "large text"
  threshold below ~18.66px) via a new `--color-pop-text` token, and a
  real ESM ordering bug in the seed script (static imports run before
  any top-level code, so env-loading had to move behind a dynamic
  `import()`). All 24 tasks in `specs/003-home/tasks.md` checked off.
- ADR 0006 (`docs/adr/0006-handle-only-public-identity.md`): a user's
  handle is the only identity ever shown to *other* users, anywhere —
  display name is retained but narrowed to self-facing UI only.
  Prompted by Home's listing card showing a host's real/Google-derived
  name; amended `get-open-postings.ts`/`listing-card.tsx` to show
  `@handle` instead. Every other feature reconciles against this ADR
  when it's actually implemented.

## [Unreleased] (cont. 5)

### Added
- **Implemented Browse**: the full faceted discovery surface at
  `/browse`, public (no auth required, unlike Home). Unlike Home's
  client-side filter over one fetched list, every facet (keyword,
  Vibe, Game, Genre, Region, Time slots, Age group, Open slots,
  Platform, Mic required) lives in the URL's `searchParams` and drives
  a real server-side Drizzle query per request — AND across facets, OR
  within a multi-select facet, via one shared `buildFilterConditions()`
  helper. Live Game/Region facet counts reflect every *other* active
  facet and never disappear even at count `0`. Removable filter pills
  plus "Clear all," three sorts (Recent/Open seats/Soonest, the last
  ordering `scheduledDate` nulls last), and an empty state linking to
  Post a Game with the search term carried over. Extends `postings`
  with `genre`/`ageGroup`/`timeSlots`/`platform`/`micRequired`/
  `scheduledDate`; relocates and extends Home's `listing-card.tsx` into
  a shared `src/components/listings/` location rather than duplicating
  it.
- **Caught and fixed a real Postgres bug**: `get-facet-counts.ts`'s two
  queries (`getGameFacetCounts`/`getRegionFacetCounts`) reused the
  shared `buildFilterConditions()` helper — which can reference
  `users.handle` for keyword search — without ever joining `users` in
  their own queries. This meant any real visitor typing a search term
  on `/browse` hit a live Postgres error ("missing FROM-clause entry
  for table \"user\""), undetected by the original test suite since it
  never exercised a keyword-search-plus-facet-count combination.
  Found via a Playwright test timing out with zero results, traced to
  the raw error in the page's RSC payload via `curl`. Fixed by adding
  the join to both queries, plus two regression unit tests.
- **Caught and fixed a flaky axe-core heading-order finding**: the
  first e2e test's a11y scan intermittently flagged an `<h1>`→`<h3>`
  jump (missing the sidebar's `<h2>` "Filters"), passing most runs but
  failing roughly 1 in 3-4. Root cause: `browse/page.tsx` wrapped every
  client component in a fallback-less `<Suspense>`, a pattern that's
  only actually necessary to avoid a build-time CSR bailout on a
  *static* page calling `useSearchParams()` — this page is already
  fully dynamic (it awaits the `searchParams` prop server-side), so the
  boundaries served no purpose and left a transient window during
  hydration where wrapped content could render blank. Removed all five
  `<Suspense>` wrappers; reran the isolated a11y test 4/4 clean and the
  full suite twice in a row, confirmed `next build` still emits
  `/browse` as dynamic (ƒ).
- **A reusable Playwright lesson**: Tailwind v4's `.sr-only` utility
  uses `clip-path`, which makes a visually-hidden native
  checkbox/radio fail Playwright's actionability check even though a
  real user can still toggle it via the wrapping `<label>`'s native
  click-forwarding. `e2e/browse.spec.ts` adds a `selectFacet()` helper
  that clicks the visible label instead of calling `.check()` on the
  hidden input's role directly.
- 11 new/extended unit test files and a 7-scenario `e2e/browse.spec.ts`
  (one with an axe-core scan) — 106 unit tests and 17 e2e tests total
  across the whole suite, all passing. `npm run typecheck`, `npm run
  lint`, `npm test`, `npm run test:e2e` (full suite, all files), and
  `npm run build` all verified green before merging. All 22 tasks in
  `specs/004-browse/tasks.md` checked off.

## [Unreleased] (cont. 6)

### Added
- **Implemented Post a Game**: the listing-creation form at `/post`
  (redirects a logged-out visitor to `/login`), with a live preview
  that reuses the same shared `listing-card.tsx` Home and Browse
  already render — the preview's `Link` is neutralized with a
  capture-phase `preventDefault()` since it's an unsaved draft, not a
  navigable card yet. Publishing is a Server Action
  (`create-posting.ts`), the first real consumer of Auth &
  Onboarding's unverified-email write gate
  (`requireVerifiedEmail()`) — an unverified session sees the form and
  can fill it out, but Publish itself is blocked with a message
  directing them to verify. Every field, including the Group size/
  Spots-open stepper relationship, is re-validated server-side via a
  new `posting.ts` Zod schema, never trusting the client's own
  clamping as sufficient. Game-name quick-pick suggestions reuse the
  same most-common-open-game aggregate Home's Trending and Browse's
  Game facet already compute (`get-game-suggestions.ts`), consistent
  with ADR 0001's rejection of a curated game list.
- **Extends `postings`** with `tags`, `recurring`, `voiceLink` — the
  last fields this entity collects across Home/Browse/this feature.
- **A real schema correction, caught during this feature's own data
  modeling**: Browse's original `genre` column was `NOT NULL`, but
  Post a Game's data-model.md (and the source wireframe) never
  required a genre chip selection to publish — Publish only ever
  gated on game+title. Loosened `genre` to nullable rather than
  inventing a fake default value; `listing-card.tsx` already rendered
  game-only when genre was absent (a structural optional field from
  Home's minimal query), and Browse's genre filter already excludes
  non-matching rows gracefully, so no other query needed to change.
- **The same heading-order a11y issue class Browse just fixed,
  caught before it ever reached a passing/failing test**: `/post`'s
  page had an `<h1>` with no `<h2>` before the live preview's reused
  `<h3>` listing title. Promoted the form's four section labels ("01 ·
  What are you playing?" etc.) and the "Live preview" label to real
  `<h2>`s — semantically correct on its own merits, and avoids the
  exact violation shape Browse hit.
- **A cold-start false alarm, not a product bug**: the first-ever
  Playwright run against this brand-new route timed out waiting for
  the post-publish redirect to `/browse` (30s, no navigation at all).
  Two isolated debug reproductions against the now-warm route/Server
  Action completed the same click-to-redirect flow in under 3 seconds
  each, and two full reruns of the real suite passed cleanly — Next.js
  dev mode compiles a route (and a Server Action) on its first-ever
  request, and this was that one-time cost, not a flaky test or a real
  defect.
- 15 new unit tests (`posting.ts`'s schema, including the stepper
  cross-field refinement) plus 7 new integration tests
  (`create-posting.ts`'s insert/gate/validation behavior against real
  Postgres) and a 4-scenario `e2e/post-game.spec.ts` (one with an
  axe-core scan) — 127 unit tests and 21 e2e tests total across the
  whole suite, all passing, twice in a row. `npm run typecheck`, `npm
  run lint`, `npm test`, `npm run test:e2e` (full suite, all files),
  and `npm run build` all verified green before merging. All 20 tasks
  in `specs/005-post-game/tasks.md` checked off.

## [Unreleased] (cont. 7)

### Added
- **Implemented Listing detail**: the public `/listing/[id]` page —
  header (recruiting/full state), About, a Details grid, a derived
  Party roster (host + accepted applicants + dashed open slots, no
  role/class label on any row per ADR 0004), a public Q&A thread
  (any verified visitor asks, only the host replies), and a sticky
  apply panel (message + Apply, or a confirmation/withdraw state once
  applied) plus Share and Save. Introduces `applications` (this
  feature's first real writer; a fourth `withdrawn` status distinct
  from `declined` so the record stays legible about who ended it) and
  `questions` (one reply per question, host-only). Second and third
  real consumer of Auth & Onboarding's unverified-email write gate
  (apply/ask/save all gated; a logged-out visitor sees a "Log in to
  apply"/"Log in to ask a question" prompt instead of a dead-end form).
  A per-resource ownership check (is this session the listing's own
  host) gates replying — a new authorization shape beyond the
  session-wide auth/verification checks every prior write action used.
- **Omits the wireframe's "What I'm looking for" checklist** (a
  3-item bullet list under About): no field in the `postings` table
  backs discrete checklist items, and Post a Game's own form only ever
  collected a single free-text description — there's no way a host
  could have entered structured checklist content in the first place.
  Rendering it would mean fabricating content. The About section shows
  the real `blurb` text in full; the checklist sub-section is left out
  rather than invented.
- **Builds `savedListings` ahead of the feature that owns its shape**:
  Profile (`007-profile-and-account-settings`) defines this entity for
  its own "Saved" tab, but Listing detail is implemented first and is
  its first real consumer — same shared-table precedent as `postings`.
  Unsaving is a real delete (a scoped, documented exception to ADR
  0005 — a bookmark carries no moderation/audit history worth
  preserving).
- **Report (FR-019) is intentionally deferred**, not stubbed: it opens
  Notifications + Report modal's (`012`) report flow, and that feature
  hasn't been implemented yet (features are being built in numeric
  order). Share and Save shipped since neither has this dependency.
  `specs/006-listing-detail/tasks.md`'s T030 documents the deferral;
  revisit as a bounded amendment to this page once `012` lands.
- **A real, reproducible bug caught by a missing `setSubmitting(false)`
  on the success path**: after a successful Apply, the local
  `submitting` flag was never reset before `router.refresh()` re-rendered
  the panel into its new "pending" branch — so the Withdraw button
  rendered already-disabled, showing "Withdrawing…" before anyone
  clicked it (the same latent bug existed in the Q&A reply handler,
  masked there because the reply form unmounts on success). Root-caused
  via a debug spec that inspected the actual accessibility snapshot at
  the moment of failure (`btn.count()` was 0 for the expected text,
  since the button had already renamed itself) rather than assuming a
  timing fluke. Fixed by resetting `submitting` immediately after the
  action resolves, on both the success and failure paths, in both
  `apply-panel.tsx` and `qa-thread.tsx`.
- **A confirmed dev-mode-only Playwright false alarm, not a product
  bug**: the Q&A e2e test's final check (a reply visible to a
  logged-out visitor) failed consistently — but only when simulated via
  `page.context().clearCookies()` on the *same* browser context. Root
  cause: `next dev` sends `Cache-Control: no-cache, must-revalidate` for
  this route (confirmed via `curl`), missing the `no-store` directive a
  production build sends (`private, no-cache, no-store, max-age=0,
  must-revalidate`, confirmed by actually running `next build && next
  start` side-by-side) — combined with no `Vary: Cookie`, Chromium's own
  HTTP cache could reuse a pre-mutation response across a cookie change
  within one browser context, a dev-server-only artifact. A genuinely
  fresh `browser.newContext()` (real isolation, not just cleared
  cookies) showed correct data on the first request, every time. Fixed
  the *test* (use a fresh context for the "different visitor" check),
  not the product — this can't happen for a real visitor in production.
- Also fixed a real, pre-existing test-isolation gap exposed by dev-seed
  data: `search-postings.test.ts`'s keyword-search test searched for the
  literal string "Casual dives," which collided with `seed-postings.ts`'s
  sample title "Casual Dives — all welcome" via a case-insensitive
  substring match. Scoped that title with the same `tag()` helper the
  file already uses for its other rows.
- 31 new unit/integration tests (`listing-detail.ts`'s Zod schemas,
  `get-roster.ts`'s derivation logic, and all five Server Actions
  against real Postgres) and a 9-scenario `e2e/listing-detail.spec.ts`
  (one with an axe-core scan) — 158 unit tests and 30 e2e tests total
  across the whole suite, all passing, confirmed twice in a row. `npm
  run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and
  `npm run build` all verified green before merging. 26 of 27 tasks in
  `specs/006-listing-detail/tasks.md` checked off (T030/Report
  deferred, see above).

## [Unreleased] (cont. 8)

### Added
- **Implemented Profile + Account settings**: four real routes under
  `/profile` sharing one layout — Overview (editable games-I-play
  list, an active-postings preview, a public-info sidebar), My
  postings (status/applicant count, Edit only before any application
  is accepted, Close/Reopen), Saved (bookmarked listings, reusing
  Listing detail's `toggleSavedListing`/`savedListings` directly), and
  Account (personal info, password change gated on having one set,
  email change with re-verification, privacy toggles, and a single
  Deactivate action — "Delete permanently" is dropped entirely, since
  ADR 0005 already makes true deletion impossible platform-wide).
  Extends `user` with `bio`, `createdAt`, four privacy booleans, and
  `deactivatedAt`; adds `userGames` (game + optional self-reported
  rank/hours, richer than onboarding's flat game-name list). Posting
  edits reuse Post a Game's own validation schema rather than
  redefining title/description/etc. bounds a second time.
- **`src/auth.ts`'s second amendment** (after Auth & Onboarding's
  Google `profile()` callback): a new `signIn` callback clears
  `deactivatedAt` on every successful sign-in, extracted into a small
  testable `reactivate-on-sign-in.ts` helper rather than inlined, so
  the reactivation logic doesn't require exercising NextAuth's own
  machinery to unit test.
- **A bounded amendment to Home and Browse**: `get-open-postings.ts`
  and `search-postings.ts` now exclude a deactivated host's postings
  from their results (FR-013/SC-005) — the same "later feature amends
  an earlier one's query" pattern this project has used repeatedly
  (e.g. Admin Users' `removedAt` exclusion).
- **Caught and fixed a real, previously-latent Vitest bug**: several
  integration test files mutate shared, global Postgres state for real
  (`get-trending.test.ts`/`get-facet-counts.test.ts` both do an
  unscoped `db.delete(postings)` in their own `beforeAll`, since they
  aggregate over the whole table) — Vitest's default file-level
  parallelism let that race with `search-postings.test.ts`'s own,
  never-cleared rows, intermittently wiping them mid-run. This bug has
  existed since Browse, silently depending on lucky scheduling timing
  every prior full-suite run. Fixed with the exact same reasoning
  `playwright.config.ts` already used for the identical class of
  problem: `vitest.config.ts` now sets `fileParallelism: false` (paired
  with `pool: "forks"`/`maxWorkers: 1`, since `fileParallelism: false`
  alone broke Vitest's own runner context on the default "threads"
  pool in this version) — correctness over parallel speed at this
  suite's current size.
- **A real, reproducible bug caught by inspecting an actual
  accessibility snapshot rather than assuming a timing fluke** (second
  time this technique has paid off, after Listing detail's identical
  `submitting`-flag bug): after a successful Apply on Listing detail
  and a successful ask/reply on its Q&A thread, the same missing-reset
  pattern existed one layer up too — none of it was product-visible
  until this feature's own e2e coverage exercised the exact
  render-into-a-new-branch-while-still-mounted shape. Not a new
  instance here — see Listing detail's own entry — but confirms the
  pattern is worth checking for on every future stateful action
  handler that calls `router.refresh()` instead of navigating away.
- **A confirmed dev-mode-only staleness window, root-caused rather
  than papered over with a blind sleep**: `updateProfile()`/
  `updatePrivacy()` had already committed by the time their success
  state rendered client-side (Server Actions only return after their
  own `await db.update()` resolves) — but an immediate fresh
  navigation or `page.reload()` could still render pre-write data for
  a few hundred milliseconds in `next dev`. Confirmed via a debug spec
  reading the same row through a separate connection immediately
  versus after a short delay. Fixed the *tests* with Playwright's
  `expect(...).toPass()` retry helper (re-running the whole
  navigate-and-check step until it settles) rather than a fixed sleep,
  and rather than changing any product code — the same category of
  dev-only artifact as Listing detail's confirmed HTTP-cache finding,
  not a real data-loss bug.
- **A real card-locator bug in the new e2e spec itself**, worth
  remembering for future tests: `div.filter({ has: <text> }).last()`
  doesn't reliably select "the specific card" when the card's own
  header row *also* contains that text as a nested div — the header
  row, being deeper in the tree, wins `.last()` instead of the actual
  card, silently scoping later assertions to the wrong (button-less)
  element. Fixed by adding a second `.filter({ has: <a button> })`,
  which the header row lacks, leaving the real card as the correct
  deepest survivor.
- 40+ new unit/integration tests (`profile.ts`'s Zod schemas,
  `requireAuth()`, and all eight Server Actions against real Postgres)
  and an 8-scenario `e2e/profile.spec.ts` (one with an axe-core scan)
  — 205 unit tests and 38 e2e tests total across the whole suite, all
  passing, confirmed twice in a row. `npm run typecheck`, `npm run
  lint`, `npm test`, `npm run test:e2e` (full suite, all files), and
  `npm run build` all verified green before merging. All 35 tasks in
  `specs/007-profile-and-account-settings/tasks.md` checked off.

## [Unreleased] (cont. 9)

### Added
- **Implemented Blocked Users**: `/profile/account/blocked` — a live
  count, client-side search over the already-fetched blocked list, and
  both empty states ("no blocks at all" vs. "no search match"). New
  `blocks` table (a block is "active" when `unblockedAt IS NULL`; never
  hard-deleted per ADR 0005 — a block has real trust/safety history
  value, so re-blocking after an unblock creates a new row instead of
  clearing the old one) and `reports` (this feature's first writer,
  `targetType='user'` only, via the Block modal's "Also report to
  moderators" checkbox — the not-yet-built Notifications + Report
  feature owns every other write path and all moderation UI).
- **This project's first modal-dialog UI**: both `unblock-modal.tsx`
  (one-step confirm) and `block-modal.tsx` (reusable two-step pick →
  confirm, accepting an optional pre-selected target) are built on the
  native `<dialog>` element (`showModal()`/`.close()`) rather than any
  library — confirmed nothing modal-related was already installed.
  Gets focus-trapping, Escape-to-close, and focus restoration to the
  triggering control for free, plus an implicit `dialog` ARIA role.
  Establishes the pattern the future Notifications + Report modal
  (`012`) should reuse.
- Both `block-user.ts` and `unblock-user.ts` extend Auth & Onboarding's
  `requireVerifiedEmail()` gate (per spec's own explicit decision);
  self-block and duplicate-active-block rejection are plain runtime
  checks in the Server Action (not Zod refines, since the schema has
  no access to the acting user's own id at definition time). Candidate
  search only needs `requireAuth()` (searching isn't itself a write)
  and excludes the searching user, every actively-blocked target, and
  any handle-less account (ADR 0006).
- **Fixed a real React 19 lint error**: `block-modal.tsx`'s
  reset-on-open logic originally called `setState` inside a
  `useEffect`, triggering `react-hooks/set-state-in-effect` (cascading
  renders). Fixed by moving the reset into React's documented
  "adjusting state during render" pattern instead.
- **Found and fixed a real accessibility bug, not unique to this
  feature**: the breadcrumb pattern already used on Listing detail (a
  `text-muted` link inline with `text-dim` surrounding text) fails
  axe's `link-in-text-block` rule (1.38:1 contrast against a required
  3:1, no underline to otherwise distinguish it). Fixed this feature's
  own breadcrumb with `underline underline-offset-2`; Listing detail's
  identical pattern is left as a documented, bounded gap for whenever
  that page is next touched.
- **The same dev-server Postgres connection-exhaustion issue from
  earlier this session recurred mid-verification** ("sorry, too many
  clients already," surfacing as unrelated failures in three other
  features' e2e specs, not this feature's own code) — same root cause
  and same fix: killed the long-running `next dev` process and
  restarted it. The full e2e suite then passed twice in a row with no
  code changes, confirming it was purely operational.
- 25+ new unit/integration tests (`blocking.ts`'s Zod schemas,
  `block-user.ts`/`unblock-user.ts` against real Postgres) and a
  2-scenario `e2e/blocked-users.spec.ts` covering quickstart.md
  Scenarios 1-2 end to end, including axe-core scans of both modals
  (Scenario 3's unverified-user gate is covered by the unit tests'
  own unverified-session cases). 220 unit tests and 40 e2e tests total
  across the whole suite, all passing, confirmed twice in a row.
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`
  (full suite, all files), and `npm run build` all verified green
  before merging. All 20 tasks in `specs/008-blocked-users/tasks.md`
  checked off.

## [Unreleased] (cont. 10)

### Added
- **Implemented Forum index**: `/forum`, public to read (FR-001) —
  category chips (six hardcoded keys plus "All," each with an
  accurate, always-unfiltered count), a debounced search, and a
  Latest/Top/Unanswered sort, all server-side and URL-driven
  (Browse's precedent) since threads accumulate indefinitely. New
  `forumThreads` table, this feature's first writer. Pinned threads
  always sort first regardless of sort; "HOT" is computed at read time
  (`isHotThread()`, never stored, never shown alongside PINNED, which
  stays a real moderator-controlled column this feature only ever
  writes `false` to). Reply/view/like counts start at 0, maintained by
  the future Forum Thread feature.
- **The New Thread modal reuses Blocked Users' native-`<dialog>`
  pattern** as its own component (different fields, nothing to share
  by direct import). `create-thread.ts` extends Auth & Onboarding's
  `requireVerifiedEmail()` gate; an unauthenticated visitor clicking
  "+ New thread" is routed to `/login` via a real `<Link>` (Listing
  detail's `apply-panel.tsx` precedent, not a client-side redirect).
- **Fixed a genuine e2e test-authoring race**: clicking the "All"
  category chip and immediately typing in the search box (two
  different URL-updating controls back to back) could have the
  debounced search read a stale `searchParams` snapshot and silently
  re-add the just-cleared category filter. Fixed by asserting the URL
  reflects each change before triggering the next.
- **`SearchInput` is keyed by the URL's own `q` value**, not just
  seeded from it once, so an externally-driven query change (a
  trending-tag click from a different component) correctly resets the
  search box's local debounce state instead of going stale.
- **A real React 19 `set-state-in-effect` lint catch**, same class
  Blocked Users' `block-modal.tsx` already hit — `new-thread-modal.tsx`
  followed the same fix (adjusting state during render, not inside a
  `useEffect`) proactively.
- 25+ new unit/integration tests (`forum.ts`'s Zod schemas, the HOT
  heuristic, `search-threads.ts`/`get-forum-stats.ts` against real
  Postgres, `create-thread.ts`'s verified/unverified/invalid-category
  cases) and a 2-scenario `e2e/forum-index.spec.ts` covering
  quickstart.md Scenarios 1-2 end to end, including an axe-core scan
  of the New Thread modal. 248 unit tests and 42 e2e tests total
  across the whole suite, all passing, confirmed twice in a row.
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`
  (full suite, all files), and `npm run build` all verified green
  before merging. All 22 tasks in `specs/009-forum-index/tasks.md`
  checked off.
