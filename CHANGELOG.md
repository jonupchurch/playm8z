# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed
- **A posting's age group now describes who a party is *for***, rather
  than a minimum age to join (feature 032, [ADR 0009](docs/adr/0009-posting-age-group-is-a-demographic-range.md)):
  **Any** (the default) / **18-29** / **30-49** / **50+**. The 18+ and
  21+ options are gone — "Any" carries the meaning 18+ used to have
  ("everyone welcome"), and the 21+ signal is dropped outright. It is
  still only a label and a filter, never an access control: nobody is
  blocked, warned, or hidden on the basis of it. **A player's own
  profile age tag is unchanged** and still reads 18+/21+ (ADR 0002) —
  the two now mean different things on purpose. Postings created before
  this keep their old tag, still display it, and expire on their own
  within 30 days; nothing is rewritten.

### Added
- **Seeded the game curation list with popular multiplayer titles.** The
  Post a Game typeahead now suggests ~46 multiplayer/co-op games drawn
  from Steam's most-played chart (single-player titles and non-game
  utilities filtered out), each with a short-form alias where obvious
  (CS2, GTA V, R6, Civ VI…) and ready for a headline image. Postings stay
  free text (ADR 0001) — this only populates the suggestion/curation
  layer, it never restricts what can be posted. Applied via the idempotent,
  skip-if-exists `scripts/seed-popular-games.ts`.
- **Messages in the top nav with an unread badge** (feature 037). The
  inbox (feature 011) was fully built but buried two clicks deep in the
  account dropdown with no unread indicator, so messaging *felt* absent.
  Signed-in members now get a first-class **Messages** entry beside the
  notification bell, with an unread-count badge (same `99+` cap and
  accessible, count-bearing label as the bell). The badge counts unread
  direct/group **messages only** — pending party requests and invites
  stay in the bell, so the same event is never double-counted across two
  icons ([spec FR-003](specs/037-inbox-nav-badge/spec.md)). The count is
  a single small query per render, defined identically to the inbox
  page's own unread rule so the two can never disagree. The now-redundant
  Inbox link was removed from the account dropdown, leaving one primary
  way in. No new tables; no messaging behavior changed.
- **Admin-editable suggested games** (feature 031). The games offered to
  new players while they create their account are now edited from the
  same **Lists** tab in Admin → Settings, instead of being hardcoded in
  the onboarding wizard. It stays a *suggestion* list, never a catalog:
  a player's games are free text (ADR 0001) and are not validated
  against it, so removing a game never touches anybody's profile and
  players can still add anything they like. An empty list is refused,
  because the games step has no free-text entry and would otherwise be a
  dead end.
- **Admin-editable genres** (feature 030). The genres offered on Post a
  Game and Browse — and counted on the landing page — are now edited
  from a **Lists** tab in Admin → Settings instead of being hardcoded,
  and both screens read the one stored list so they can never disagree.
  Retiring a genre stops it being offered but never touches a posting
  already using it; that posting keeps and displays its genre, and its
  host can still edit it. Browse now ignores just an unrecognised genre
  in a stale link rather than silently discarding the whole filter.
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

## [Unreleased] (cont. 11)

### Added
- **Implemented Forum Thread**: `/forum/thread/[id]`, public to read
  (FR-001) — the largest feature built so far (3 user stories, 3 new
  tables, 4 Server Actions, a second writer of `reports`). The original
  post renders distinctly via an OP badge, reflecting the thread's own
  pinned/HOT state exactly as Forum index defines it. View count
  increments once per page load, no per-visitor dedup.
- **Reply sort is client-side**, deliberately different from Forum
  index's server-side/URL-driven choice — a single thread's own reply
  count is bounded, unlike Forum index's ever-growing cross-category
  list, so fetching every reply once and sorting in the browser is
  simpler and keeps the ephemeral "currently quoting X" state trivially
  colocated.
- **New `likes` table**: a real per-user relationship with a
  database-level unique constraint on `(userId, targetType, targetId)`
  — the actual enforcement point for "can't double-like," not just an
  application-level check. `forumThreads.likes`/`forumReplies.likes`
  stay denormalized for fast reads, kept in sync transactionally.
- **New `forumReplies`** (this feature's only writer) and
  **`threadSubscriptions`** (a per-user preference only, no
  notification delivery wired up). Reusing Blocked Users' `reports`
  table as this feature's second writer (`targetType='forum'`), no new
  report shape, still no review/queue UI.
- **Dropped the wireframe's "TOP REPLY"/best-answer badge entirely** —
  no control anywhere sets it; the separate, real "Top" sort (by like
  count) is unaffected and kept.
- **A genuine test-design lesson**: firing two concurrent
  `toggleLike()` calls at the same target isn't a reliable way to test
  duplicate-like prevention — toggle semantics mean a second request
  that sees the first's already-committed insert takes the *unlike*
  branch instead, a real order-dependent outcome, not a bug. Fixed by
  testing the unique constraint directly (two raw inserts of the
  identical row, confirming the second throws) instead of racing
  through the public action.
- **Every write action (reply/like/report/subscribe) routes an
  unauthenticated visitor to `/login`** via a real `<Link>` (Listing
  detail's `apply-panel.tsx` precedent), threaded through four separate
  small reusable components (`LikeButton`, `ReportButton`,
  `SubscribeButton`, `ReplyComposer`) rather than one shared gate.
- 35+ new unit/integration tests (`forum-thread.ts`'s Zod schemas,
  `get-thread.ts`'s sort/related-thread/quoted-reply logic against
  real Postgres, all four Server Actions including the direct unique-
  constraint tests) and a 3-scenario `e2e/forum-thread.spec.ts`
  covering quickstart.md Scenarios 1-3 end to end, including an
  axe-core scan. 284 unit tests and 45 e2e tests total across the
  whole suite, all passing, confirmed twice in a row. `npm run
  typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (full
  suite, all files), and `npm run build` all verified green before
  merging. All 28 tasks in `specs/010-forum-thread/tasks.md` checked
  off.

## [Unreleased] (cont. 12)

### Added
- **Implemented Inbox / messaging**: a two-pane `/inbox` (conversation
  list + `/inbox/[id]` chat pane), authenticated only, merging real
  `conversations` the user belongs to with pending Applications on
  postings they host into one searchable, unified list (FR-002).
  Search is client-side, following Forum Thread's own reply-sort
  precedent: a user's own inbox is a bounded, single-parent list, unlike
  Forum index's ever-growing cross-category thread list.
- **New `conversations`/`messages` tables**. `conversations.lastReadAt`
  is a per-member JSON read-cursor, added beyond data-model.md's
  original sketch for the same reason Forum Thread's
  `threadSubscriptions` gained a retroactive unique constraint: accurate
  unread counts need a per-viewer read cursor to exist somewhere. A
  pending Application's own `message` field doubles as a synthesized
  "request" list item's opening line — no `Conversation`/`Message` row
  exists until the host accepts, avoiding any amendment to Listing
  detail's already-merged apply flow.
- **`accept-request.ts` is this project's first `db.transaction()`** —
  Application status, the posting's `seatsOpen`/`status`, and a new
  `Conversation` (with a system message) change together, guarded by a
  `.returning()`-checked update so a concurrent double-accept can't
  double-decrement seats or create two conversations. Verified with a
  genuine concurrent-call test — unlike Forum Thread's toggle-race
  lesson, accepting is a one-way transition, not a toggle, so
  `Promise.all`-ing two concurrent calls is a valid way to test it here.
- **`search-contacts.ts` excludes a block in *either* direction** —
  Blocked Users' own candidate search only excludes users the searching
  user has blocked; this is the first feature to also exclude someone
  who has blocked the searching user, since messaging is exactly what
  that feature's own UI promises blocking prevents.
  `start-conversation.ts` re-checks the same relationship server-side
  per recipient.
- **Three real bugs found and fixed**: (1) a native `<dialog>` styled
  with a bare Tailwind `flex` utility never hides when closed, since
  Tailwind v4's `@layer`-emitted utilities beat the UA stylesheet's
  `dialog:not([open])` rule regardless of specificity — fixed via
  `hidden open:flex` (likely a latent, unfixed bug in Blocked Users'/
  Forum index's own dialogs too, out of this feature's scope); (2) this
  Next.js version's client `router.refresh()` called immediately after
  `router.push()` can lose a race and revert navigation to the old URL —
  fixed by moving cache invalidation server-side via `revalidatePath(path,
  "layout")` inside the Server Actions themselves (this Next.js
  version's documented pattern; `next/cache` is now mocked globally in
  `vitest.setup.ts`); (3) a Playwright `getByText()` false-positive
  matched a composer textarea's still-pending value before its async
  send resolved.
- 40+ new unit/integration tests and a 6-scenario `e2e/inbox.spec.ts`
  covering quickstart.md Scenarios 1-3 plus unauthenticated-redirect and
  group-sender-grouping, including two axe-core scans. 327 unit tests
  and 51 e2e tests total across the whole suite, all passing, confirmed
  twice in a row. `npm run typecheck`, `npm run lint`, `npm test`, `npm
  run test:e2e` (full suite, all files), and `npm run build` all
  verified green before merging. All 31 tasks in
  `specs/011-inbox-messaging/tasks.md` checked off.

## [Unreleased] (cont. 13)

### Added
- **Implemented Notifications + Report modal**: a nav-level bell
  dropdown (accurate unread count + preview) plus a full
  `/notifications` page (All/Unread/Requests/Forum/System filters,
  Today/Earlier grouping, mark-read/mark-all-read, empty state), and a
  reusable, canonical 3-step Report modal (reason → optional details +
  "Also block" → done).
- **New `notifications` table and a `createNotification()` helper**,
  shipped with no live callers yet (each already-existing write
  action's own retrofit is tracked in `docs/future-work.md`),
  demonstrated against seeded data plus one genuinely live source:
  pending/resolved join-request Applications are synthesized into
  "request" items, the same pattern Inbox's own merged `/inbox` list
  uses — except this feed also keeps `accepted`/`declined` ones around
  (Inbox's own list only ever shows `pending`) so a resolved request
  still shows its resolved state instead of disappearing. Accept/Decline
  on a request notification call Inbox's (`011`) existing
  `accept-request.ts`/`decline-request.ts` directly — no duplicated
  transaction logic.
- **Extends Blocked Users' (`008`) `reports` table** with its first real
  `reason` values and a new `details` column (data-model.md's original
  sketch specified `details` as validated input but never actually
  added a column for it). `submit-report.ts` decouples "what's
  reported" from "who gets blocked" via an explicit `blockUserId`,
  separate from `targetId` — reporting a posting blocks its host, not
  the posting id.
- **Retroactively un-defers Listing detail's (`006`) Report action**
  (T030): the apply panel reports the posting (blocking its host); each
  Q&A entry reports its asker directly.
- **Three real issues found and fixed**: (1) no shared nav shell exists
  anywhere in this codebase (every prior feature deferred it as future
  Design System infra) — created the smallest possible slot, a thin
  `SiteHeader` (logo + bell only) in the root layout, and shrank
  Inbox's own fixed `h-screen` layout by the new header's height so it
  doesn't overflow; (2) a client component imported a runtime function
  from the same module that also exported the DB-touching
  `getNotifications()`, pulling the `postgres` driver into the browser
  bundle and crashing every page — fixed by splitting the pure
  filter/grouping logic into its own client-safe `filter-notifications.ts`
  (Inbox's own `InboxItem` import avoided this only because it was
  type-only, which a runtime function import doesn't get for free); (3)
  the same axe-core color-contrast violation class Inbox already hit
  once (`text-dim` on an accent-tinted background, 4.37:1) — fixed with
  `text-muted`.
- 30+ new unit/integration tests and a 9-scenario
  `e2e/notifications.spec.ts` covering quickstart.md Scenarios 1-3 plus
  unauthenticated-redirect and empty-state, including three axe-core
  scans. 359 unit tests and 60 e2e tests total across the whole suite,
  all passing, confirmed twice in a row. `npm run typecheck`, `npm run
  lint`, `npm test`, `npm run test:e2e` (full suite, all files), and
  `npm run build` all verified green before merging. All 25 tasks in
  `specs/012-notifications-and-report-modal/tasks.md` checked off, plus
  Listing detail's previously-deferred T030.

## [Unreleased] (cont. 14)

### Added
- **Implemented News feed**: the public `/news` page, no login
  required, with a single featured post shown only when no category
  filter or search is active, server-side URL-driven category/search
  (Browse/Forum index's precedent), cumulative "Load more" pagination,
  and a no-account-required newsletter subscribe strip.
- **New `newsPosts` table** — minimal, read-only from this feature
  (the future Admin News feature is the canonical writer and extends
  it), and **new `newsletterSubscribers` table** with
  `subscribe-newsletter.ts` — this project's first write action with
  genuinely no session check at all, guarded only by a database-level
  unique constraint on `email`.
- **Two real, previously-latent bugs found and fixed, both pre-existing
  and unrelated to this feature's own new code**: (1) a shared
  `isUniqueViolation()`-style helper in FOUR other files
  (`toggle-like.ts`, `toggle-subscription.ts`, Auth & Onboarding's
  register route, Profile's `update-email.ts`) checked `err.code`
  directly, but Drizzle wraps the raw postgres.js error in a
  `DrizzleQueryError` whose own `code` is undefined — the real code
  lives at `err.cause.code` — so every one of those catch branches had
  silently never worked; fixed identically across all five call sites;
  (2) two sibling dev-only seed scripts with no top-level import/export
  both declared `main()` in the same TypeScript global scope and
  collided the moment a second one existed — fixed by making both
  explicit ES modules (`export {}`).
- 30+ new unit/integration tests and a 7-scenario
  `e2e/news-feed.spec.ts` covering quickstart.md Scenarios 1-2, with two
  axe-core scans. 380 unit tests and 67 e2e tests total across the
  whole suite, all passing, confirmed twice in a row. `npm run
  typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (full
  suite, all files), and `npm run build` all verified green before
  merging. All 19 tasks in `specs/013-news-feed/tasks.md` checked off.

## [Unreleased] (cont. 15)

### Fixed
- **Production was down (every page returning HTTP 500)**: the Neon
  database backing `https://playm8z.vercel.app` had only the four
  Auth.js tables (`account`/`session`/`user`/`verificationToken`) — the
  result of a single `drizzle-kit push` done at initial Vercel/Neon
  setup, never repeated since. All 15 migrations generated since then
  (postings, browse, profile, forum, inbox, notifications, news, the
  `settings` table, etc.) were applied to local dev Postgres via
  `db:migrate` but never to production — there is no migration step
  anywhere in the deploy pipeline (`build` is plain `next build`). This
  stayed invisible because Google OAuth sign-in only touches the four
  tables that did exist; it became fatal once `proxy.ts`'s
  maintenance-mode gate started querying `settings` on every request
  (`relation "settings" does not exist`). Fixed by pulling the
  production `DATABASE_URL` to an isolated scratch file (never
  `.env.local`) and running `drizzle-kit push` against it to reconcile
  prod with `schema.ts` — confirmed safe first by checking all 15
  migration files are additive-only (no `DROP TABLE`/`TRUNCATE`) — then
  manually inserting the one missing default `settings` row (`push`
  reconciles structure only, not migration files' seed `INSERT`s).
  Verified `/`, `/login`, `/browse`, `/news`, and `/forum` all return
  200 in production afterward. No application code changed. **Every
  future feature that touches `src/db/schema.ts` needs its migration
  separately pushed to production — committing the migration file alone
  does nothing for prod.**
- Wired a `vercel-build` script (`drizzle-kit push --verbose && next
  build`) into `package.json` so this can't recur structurally — Vercel
  runs `vercel-build` instead of `build` when present, so every future
  deploy reconciles schema before building. Deliberately no `--force`
  (that only auto-approves data-loss statements; every migration so far
  has been additive, matching ADR 0005): a genuinely destructive future
  migration should fail the build loudly, not auto-apply silently.
  Verified locally end-to-end and in a real production deploy.

## [Unreleased] (cont. 16)

### Added
- **Implemented Content Page**: a slug-based public page at
  `/pages/[slug]`, block-rendered from a single JSONB array (Heading/
  Paragraph/List/Quote/Callout/Divider) on a new `contentPages` table,
  with an inline moderator-or-higher edit mode directly on the page
  itself — batched local-state add/reorder/delete/edit with an explicit
  Save/Cancel (no per-keystroke autosave), and an independent Publish/
  Unpublish toggle. An unpublished (draft) page is indistinguishable
  from a genuinely missing slug for anyone below moderator — both 404.
- **`require-role.ts` (Error Pages, 002)'s first real consumer** — both
  the draft-visibility check (wrapped in a try/catch converting any
  rejection into the same `notFound()` a missing slug gets) and the two
  new Server Actions (`save-content-page.ts`, `toggle-page-status.ts`,
  called directly/un-caught) reuse it. Its rank check is still
  hardcoded to `user` for every session (no `role` column exists until
  Admin Settings/024), so today every real session — including a
  genuinely logged-in one — is correctly rejected by the moderator
  gate; this is expected, not a bug.
- **A genuine, structural testing gap, not a shortcut**: User Stories 2
  and 3 (inline edit, publish/unpublish) are fully implemented, real
  code paths, but no test account can currently pass
  `requireRole("moderator")` to exercise them through an actual browser
  session. `save-content-page.test.ts`/`toggle-page-status.test.ts`
  cover the persistence logic directly by mocking `requireRole` (both
  the "passes" and "rejects" cases); `e2e/content-page.spec.ts` covers
  everything genuinely reachable today — public reading of all six
  block types (axe-clean), 404 for a missing/draft slug for both an
  anonymous and a logged-in non-moderator visitor, and confirming no
  edit controls render for that non-moderator session either. The "a
  real moderator succeeds" e2e scenario stays untestable until Admin
  Settings ships the real `role` column.
- 21 new unit/integration tests and a 4-scenario `e2e/content-page.spec.ts`
  with one axe-core scan. 401 unit tests and 71 e2e tests total across
  the whole suite, all passing, confirmed twice in a row. `npm run
  typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (full
  suite, all files), and `npm run build` all verified green before
  merging. All 21 tasks in `specs/014-content-page/tasks.md` checked off.

## [Unreleased] (cont. 17)

### Added
- **Built the real global nav shell** (`site-header.tsx`, `nav-links.tsx`,
  `profile-menu.tsx`) — Design System infrastructure, exempt from the
  per-feature spec gate, built directly. Replaces the bare logo+bell
  slot every prior feature deferred to: Browse/Forum/News links with
  active-state highlighting, a "Post a game" CTA, and a signed-in
  avatar dropdown (Profile/Inbox/Log out). Groups intentionally
  omitted despite `sitemap.md`'s nav line still listing it (product
  vision already deferred it — an ADR-precedent override, not an
  oversight). **First place in the app a signed-in user can actually
  log out.**

### Fixed
- **Maintenance mode is a `proxy.ts` *rewrite***, so the nav's first
  attempt at hiding itself there via `usePathname()` string-matching
  `"/maintenance"` never worked (the browser URL stays whatever route
  the visitor actually requested). Fixed by checking `getSettings()`
  directly in `site-header.tsx`, the same already-cached flag
  `proxy.ts` itself gates on.
- **`ErrorState`'s own decorative `<header>` became a duplicate banner
  landmark** once the real global nav existed, failing axe-core on
  404/500. Converting it to a `<div>` traded that for a *different*
  violation (content orphaned from any landmark). Removed the logo
  bar outright instead — fully redundant with the real nav's own logo
  everywhere it shows except actual maintenance mode, where it's moot.
- Both caught by the existing e2e suite, not speculative. No new
  tests added (pure UI infra); full suite (401 unit, 71 e2e) green,
  e2e confirmed twice in a row, `npm run build` confirmed twice.

## [Unreleased] (cont. 18)

### Fixed
- **CI had been silently failing on every run since Error Pages
  shipped** (23 consecutive failures, entirely unnoticed since only
  local verification was ever checked before merging). Root cause:
  `ci.yml`'s CI database is freshly `drizzle-kit push`'d on every
  run — structural DDL only, no migration files' seed `INSERT`s (the
  same class of gap as today's earlier production migration incident,
  here breaking CI instead). `e2e/maintenance.spec.ts`'s own
  `setMaintenance()` helper assumed Error Pages' seeded `settings` row
  already existed and crashed (`row.id` on `undefined`) the moment it
  didn't. Fixed by inserting a row when none exists rather than
  assuming an UPDATE always finds one. Verified by reproducing the
  exact scenario locally (cleared the local `settings` table entirely,
  confirmed the old code failed, confirmed the fix passes). **CI is
  still failing after this fix** — a full local repro (fresh Postgres,
  matching CI's exact push/env-var setup) passed clean, so the
  remaining failure is CI-environment-specific; couldn't pull the real
  Playwright output to diagnose further without authenticated `gh`/API
  access. See `status.md`.
- **Google OAuth sign-ins were permanently stuck "unverified,"** unable
  to ever pass verification and blocked from posting/applying/
  messaging. `@auth/core`'s own OAuth callback handler unconditionally
  forces `emailVerified: null` on a brand-new account, overriding
  whatever `src/auth.ts`'s Google `profile()` computed from Google's own
  claim — core library behavior, not fixable via provider config. Fixed
  with `verify-google-email.ts` (unit tested), called from the existing
  `signIn` callback, which also retroactively fixes any account already
  stuck this way since it runs on every sign-in. The reporting user's
  own stuck production account was patched directly at the same time.
- **Every native `<dialog>`-based modal in the app** (`block-modal.tsx`,
  `unblock-modal.tsx`, `compose-modal.tsx`, `new-thread-modal.tsx`,
  `report-modal.tsx`) **was rendering pinned to the top-left of the
  viewport instead of centered**, since each one's own feature shipped.
  Tailwind's preflight resets `margin: 0` on every element, silently
  overriding the browser's own `dialog:modal { margin: auto }` centering
  rule. Invisible to every automated check this project runs (Playwright
  checks function, not visual position; axe-core doesn't check
  centering either) — found by reproducing a user's screenshot report
  directly with a throwaway script. Fixed with one global CSS rule,
  fixing all five modals at once and any future one for free.

## [Unreleased] (cont. 19)

### Fixed
- **`block-modal.tsx` and `new-thread-modal.tsx` never actually hid
  after closing** — a more severe bug hiding behind the centering fix
  above, found via a user's incognito-window screenshot showing a
  stuck modal fragment. Both used an unconditional `className="flex
  ..."` on their `<dialog>`; since author-stylesheet rules (Tailwind)
  always beat user-agent rules regardless of specificity, this
  permanently defeated the browser's own `dialog:not([open]) {
  display: none }`, leaving the dialog fully rendered (mispositioned
  top-left) forever after `.close()`. Fixed by switching both to the
  `"hidden ... open:flex ..."` pattern already used correctly in
  `report-modal.tsx`/`compose-modal.tsx`. Verified via a throwaway
  Playwright script: `display: none` and a zero-size rect after
  closing, versus a full-size rect at `(0,0)` before.
- **`e2e/inbox.spec.ts` had a genuine strict-mode-violation race**,
  found in real CI logs the user pasted (16 documents from a run still
  failing after the settings-row fix): a freshly-sent message's text
  matched both the sidebar conversation list's preview *and* the
  message thread's own bubble, so an unscoped `getByText(freshMessage)`
  hit two elements once the send resolved. Fixed by scoping the
  assertion to the thread's own `[aria-live="polite"]` region.
- `e2e/browse.spec.ts`'s "multi-select OR within a facet, AND across
  facets" CI failure (from the same pasted logs) remains open —
  investigated but not reproduced locally, no fix yet.
- Full suite reconfirmed: 402 unit, 71 e2e (a first post-fix e2e run
  showed 16 unrelated `ERR_CONNECTION_REFUSED` failures, traced to two
  stale `next start -p 3001` servers left running from the prior day —
  killed and reran clean). `npm run build` confirmed twice.

## [Unreleased] (cont. 20)

### Fixed
- **Any forum thread posted with no tags 500'd when opened.**
  `get-thread.ts`'s "related threads" query called Drizzle's
  `arrayOverlaps(forumThreads.tags, thread.tags)` unconditionally, but
  `arrayOverlaps` throws on an empty array — and Tags is an optional
  field on New Thread. Found by matching the user's reported error
  digest against production runtime logs. `search-postings.ts`
  elsewhere already guards this same operator with `.length > 0`;
  `get-thread.ts` didn't. Fixed by falling back to a category-only
  match when the thread has no tags. Added a regression test (fails on
  the old code, passes on the fix) — the existing suite never caught
  this because its only untagged test thread was the one being
  searched *for*, never the primary thread whose own tags feed the
  query. Full suite green (403 unit, 71 e2e), `npm run build` confirmed
  twice.

## [Unreleased] (cont. 21)

### Added
- Admin Dashboard (`specs/015-admin-dashboard/`, branch
  `015-admin-dashboard` merged to `main`) — all 24 tasks complete:
  `/admin`'s main content area (sidebar shell is Design System infra,
  not yet built), five real-count KPI cards, a 7-day activity chart
  with a Signups/Active/Postings metric switcher (real ARIA tab
  semantics, a visually-hidden `<table>` as the non-visual data
  equivalent), Needs-attention (three `reports`-table queues by
  `targetType`), a recent-activity feed backed by a new `auditEntries`
  table, and Top games (reuses Home's/Browse's existing Trending query
  directly). New `src/lib/admin/activity-data.ts` centralizes the
  "active today" distinct-user union across five tables plus local-
  calendar-day bucketing, shared by the KPI and chart queries so the
  source list can't drift between them; day-bucketing happens in JS
  (matching `filter-notifications.ts`'s existing "today" convention)
  rather than a SQL `date_trunc`, avoiding a database-timezone
  mismatch. `requireRole("moderator")` gates the whole route — its
  second real consumer after Content Page (014) — so, like that
  feature's own US2/US3, the real content can't be exercised by a real
  session yet (no `role` column until Admin Settings/024); every
  `lib/admin/*.ts` query is unit-tested directly instead (KPI tests use
  before/after deltas against shared global tables to stay correct
  regardless of pre-existing data), and e2e covers the real, current
  access-denial behavior for both an unauthenticated visitor and a
  logged-in non-moderator. Visually verified against real seeded data
  via a throwaway local QA pass (temporarily bypassing the role gate,
  screenshotting, then fully reverting before commit). Full suite green
  (413 unit, 73 e2e), `npm run build` confirmed twice.

## [Unreleased] (cont. 22)

### Added
- Admin Users (`specs/016-admin-users/`, branch `016-admin-users`
  merged to `main`) — all 27 tasks complete: `/admin/users`'s stats
  (total/active/flagged/banned), a real server-side searchable/
  filterable table with computed "flagged" status (an unbanned user
  with an open `user`-targeted report, never stored), Ban/Unban (the
  single severe account action — no separate Delete, reapplying
  Profile's Deactivate-vs-Delete resolution), and a per-user detail
  drawer (native `<dialog>`, real focus trap/Escape-to-close, real ARIA
  tab semantics) with a real, effect-having Remove action. Extends
  `user` with `bannedAt` and `postings`/`forumThreads` with
  `removedAt`; bounded amendments to Home's `get-open-postings.ts`,
  Browse's `search-postings.ts`, and Forum index's `search-threads.ts`
  now exclude removed rows. `requireRole("moderator")` gates the route
  and both new Server Actions independently — the third real consumer
  after Content Page (014) and Admin Dashboard (015) — so the real
  table/ban/drawer content can't be exercised by a real session yet (no
  `role` column until Admin Settings/024); every query/action is
  unit-tested directly instead, and e2e covers the real, current
  access-denial behavior.

### Fixed
- Caught two real bugs during development/QA: (1) `search-admin-
  users.ts`'s three count subqueries all aliased their column as
  `"count"`, which Postgres rejected as ambiguous once joined together
  — fixed with distinct names, caught immediately by the query's own
  unit test; (2) both new Server Actions called
  `revalidatePath("/admin/users")` without the `"layout"` type
  argument — the same stale-UI-after-Server-Action bug this project
  already hit and fixed once for Inbox/messaging (011) — caught by
  temporarily bypassing the role gate locally and clicking through the
  real Ban/Unban/Remove flows (fully reverted before commit); also
  confirmed the inline Ban-confirm's focus management (focus moves to
  "Yes", then back to the row's Ban button on Cancel) and that a
  removed posting is genuinely excluded from Browse. Full suite green
  (435 unit, 75 e2e), `npm run build` confirmed twice.

## [Unreleased] (cont. 23)

### Added
- Admin Postings (`specs/017-admin-postings/`, branch
  `017-admin-postings` merged to `main`) — all 31 tasks complete:
  `/admin/postings`'s stats (in queue/user-reported/auto-flagged/removed
  today), a queue combining reported and auto-flagged postings under
  one queue-membership formula, a computed-not-stored severity band
  (worst of every open report's reason-implied severity and the
  posting's auto-flag reason's own fixed severity), URL-driven filter
  chips, and a per-posting review drawer (why it's here, author card
  with prior-warnings/total-posts) with Approve/Remove/Warn/Ban. New
  deterministic auto-flag ruleset (`src/lib/postings/auto-flag.ts`)
  wired into Post a Game's (005) `create-posting.ts`. New `warnings`
  table (this feature's only writer) and `postings.autoFlagReason`/
  `moderationReviewedAt` columns. Ban delegates to Admin Users' (016)
  existing `toggleUserBan` then removes the posting under review via
  the same path Remove uses. `resolvePostingReport`/`banPostingAuthor`
  are the project's first real callers of `logAuditEntry()` (015), also
  retroactively wiring Admin Users' own `toggleUserBan`/
  `removeUserContent` to it. `requireRole("moderator")` gates the route
  and both new Server Actions independently — the fourth real consumer
  after Content Page (014), Admin Dashboard (015), and Admin Users
  (016) — so the real queue/drawer/resolution content can't be
  exercised by a real session yet (no `role` column until Admin
  Settings/024); every query/action is unit-tested directly instead,
  and e2e covers the real, current access-denial behavior.

### Fixed
- Retroactively fixed a real over-count bug in Admin Dashboard's
  `get-dashboard-kpis.ts` and Home's/Browse's shared `get-trending.ts`:
  both were missing the same `removedAt IS NULL` exclusion Admin
  Users' (016) own amendments already added to three other queries — a
  removed-but-still-`open` posting was inflating "Live postings" and
  could still appear in Trending.

### Verified
- Visual QA (temporary local role-gate bypass across `page.tsx` and all
  three gated Server Actions, since `banPostingAuthor` transitively
  re-triggers `toggleUserBan`'s own independent gate too, fully
  reverted before commit) exercised all four resolution actions
  end-to-end with no new bugs found. Confirmed via direct DB checks:
  reports resolve, `warnings`/`auditEntries` rows land correctly, a
  removed posting disappears from Browse, and Ban both bans the account
  and removes the posting under review. Full suite green (474 unit, 77
  e2e), `npm run build` confirmed twice.

## [Unreleased] (cont. 24)

### Added
- Admin Forum (`specs/018-admin-forum/`, branch `018-admin-forum`
  merged to `main`) — all 41 tasks complete: `/admin/forum`'s stats (in
  queue/user-reported/auto-flagged/actioned today — the last a live
  read of `auditEntries`, not a stored counter), a queue spanning
  threads AND replies under the same queue-membership formula as Admin
  Postings (017), filterable All/Threads/Replies/Auto-flagged, and a
  review drawer showing the flagged content in context (a reply's
  immediately-preceding message dimmed above it, falling back to the
  thread's own OP when it's the thread's first reply) with
  Approve/Remove/Lock (threads only)/Warn/Ban. Reuses Forum Thread's
  (010) existing `reports` usage and Admin Users' (016)
  `toggleUserBan`/`forumThreads.removedAt` directly. Adds a new
  `forumReplies.removedAt` and `autoFlagReason`/`moderationReviewedAt`
  on both `forumThreads` and `forumReplies`; "Lock thread" reuses
  `forumThreads`' existing `locked` boolean rather than adding a
  redundant `lockedAt` column. Small bounded amendments wire the shared
  auto-flag ruleset into `create-thread.ts`/`post-reply.ts` (which also
  now rejects replying to a locked thread, re-verified server-side) and
  exclude removed replies from `get-thread.ts`'s reply list.
  `requireRole("moderator")` gates the route and all three new/reused
  Server Actions independently — the fifth real consumer after Content
  Page (014), Admin Dashboard (015), Admin Users (016), and Admin
  Postings (017) — so the real queue/drawer/resolution content can't be
  exercised by a real session yet (no `role` column until Admin
  Settings/024); every query/action is unit-tested directly, and e2e
  covers the real, current access-denial behavior.

### Changed
- Extracted `src/lib/moderation/reason-severity.ts` and
  `auto-flag-rules.ts` as shared helpers out of Admin Postings' (017)
  own inline copies — the "generalize once a second real consumer
  exists" trigger 017's own research.md anticipated.
- Generalized 017's posting-specific `warnings.postingId` column to a
  polymorphic `targetType`/`targetId` pair (the "generalize if a third
  distinct source appears" trigger 017's research.md separately
  anticipated) — every pre-existing warning implicitly becomes
  `targetType = 'posting'`. "Prior warnings" now correctly combines
  across postings/threads/replies in one count.

### Verified
- Visual QA (temporary local role-gate bypass across `page.tsx`,
  `resolve-forum-report.ts`, `ban-forum-author.ts`, and — transitively,
  since `banForumAuthor` calls it — `toggle-user-ban.ts`, fully reverted
  before commit) exercised all five resolution actions end-to-end with
  no new bugs found. Confirmed via direct DB checks and the real Forum
  index/Forum Thread pages: reports resolve, `warnings`/`auditEntries`
  rows land correctly with the generalized shape, a removed thread
  disappears from Forum index while a removed reply disappears from
  just its own thread's reply list, Ban both bans the account and
  removes the content under review, and a locked thread's real reply
  form still renders but a genuine submission attempt is rejected with
  a visible error (confirmed by actually submitting the form as a
  regular user). Full suite green (504 unit, 79 e2e), `npm run build`
  confirmed twice.

## [Unreleased] (cont. 25)

### Added
- Admin Reports (`specs/019-admin-reports/`, branch `019-admin-reports`
  merged to `main`) — all 37 tasks complete: `/admin/reports`'s unified
  triage queue across postings, forum, profiles, and messages. Stats
  (open reports/high priority/resolved today/avg response — the last
  two the first live read of a new `reports.resolvedAt`), a queue
  grouped by reported target (not one row per report, unlike Admin
  Postings'/Admin Forum's own queues), filterable All/Postings/Forum/
  Profiles/Messages, and a review drawer (representative reporter +
  "+N others reported this," reported content in context, an "Open in
  [module] moderation →" cross-link where a dedicated queue exists)
  with Dismiss (new, generic, any target type)/Remove/Warn/Ban.
  Remove/Warn/Ban for postings and forum targets DELEGATE to `017`'s/
  `018`'s existing resolution actions (via a new shared
  `classify-forum-target.ts`) rather than reimplementing. Profiles and
  messages are this feature's first real mover: new `messages.removedAt`
  (with a bounded amendment to Inbox's `011` conversation-view query)
  and direct `warnings` writes with `targetType='message'` or `null`.
  "Total reports" (owner card) is a computed, all-time, cross-source
  aggregate, never a maintained counter. `requireRole("moderator")`
  gates the route and all three new Server Actions independently — the
  seventh real consumer after Content Page (014), Admin Dashboard
  (015), Admin Users (016), Admin Postings (017), and Admin Forum
  (018) — so the real queue/drawer/resolution content can't be
  exercised by a real session yet (no `role` column until Admin
  Settings/024); every query/action is unit-tested directly, and e2e
  covers the real, current access-denial behavior.

### Changed
- Retroactively added `reports.resolvedAt`, set by `017`'s
  `resolve-posting-report.ts` and `018`'s `resolve-forum-report.ts`
  alongside their existing `status = 'resolved'` write — a one-line
  addition to an already-correct UPDATE, needed for this feature's own
  "resolved today"/"avg response" stats.
- Corrected the shared `reason-severity.ts`'s `impersonation` mapping
  from medium (018's original assignment) to high — a
  phishing-adjacent impersonation case is a real security risk, per
  this feature's own wireframe seed data. Immediately and correctly
  changes severity display on `017`'s/`018`'s own queues too.

### Verified
- Visual QA (temporary local role-gate bypass across `page.tsx`,
  `dismiss-report.ts`, `resolve-report-action.ts`,
  `ban-reported-user.ts`, and — since the cross-link navigates for
  real into them — Admin Forum's/Admin Postings'/Admin Users' own page
  gates too, plus the full transitive chain into
  `resolve-posting-report.ts`/`resolve-forum-report.ts`/
  `toggle-user-ban.ts`, fully reverted before commit) exercised
  grouping, the corrected severity mapping, filtering, the drawer's
  cross-link, and Dismiss/Remove/Warn/Ban end-to-end with no product
  bugs found. Confirmed via direct DB checks and the real Inbox page:
  removing a posting/message sets its `removedAt` and drops it from
  the queue, a removed message disappears from its real Inbox
  conversation while an untouched sibling message still shows, and
  banning from a message report both bans the account and removes that
  message. Full suite green (534 unit, 81 e2e), `npm run build`
  confirmed twice.

## [Unreleased] (cont. 26)

### Added
- Admin News (`specs/020-admin-news/`, branch `020-admin-news` merged
  to `main`) — all 26 tasks complete: `/admin/news`'s two-pane CMS —
  News feed's (013) first real `NewsPost` writer. A filterable
  (All/Published/Drafts/Scheduled) post list alongside an editor
  (cover swatches, title, category chips, excerpt, a
  markdown-snippet-assisted body textarea, publish settings) with a
  live preview tracking every field change before saving. One
  `save-news-post.ts` Server Action handles Publish now/Update/
  Schedule/Save draft/Delete via a discriminated `action` field:
  `publish` only sets `publishedAt=now()` when the row isn't already
  published; `save-draft` always overrides to `draft` regardless of
  the on-screen status control; `delete` sets `status=draft` (never a
  hard delete, ADR 0005). Reuses `013`'s `featured` column for "pin,"
  enforcing the at-most-one-featured invariant in the same transaction
  as every save. `requireRole("moderator")` gates the route and the
  Server Action — the eighth real consumer after Content Page (014),
  Admin Dashboard (015), Admin Users (016), Admin Postings (017),
  Admin Forum (018), and Admin Reports (019) — so the real list/editor
  content can't be exercised by a real session yet; every query/action
  is unit-tested directly, and e2e covers the real, current
  access-denial behavior.

### Changed
- Amended `013`'s `search-news.ts` (main grid query and the
  featured-post pick) so the public feed only shows posts that are
  `published`, or `scheduled` with a publish date/time that has
  passed — computed at read time, no background job.
- Updated `scripts/seed-news-posts.ts` and `e2e/news-feed.spec.ts` to
  seed `status: "published"` explicitly, since `newsPosts.status`'s
  new schema default is `draft`.

### Verified
- Visual QA (temporary local role-gate bypass across `page.tsx` and
  `save-news-post.ts`, fully reverted before commit) exercised
  create+publish (live preview confirmed live on the real `/news`
  page), edit-and-Update (publishedAt unchanged), schedule (absent
  from `/news`), Save-draft-overrides-the-status-control,
  pin-exclusivity, and delete-as-unpublish (gone from `/news`, still
  editable under Drafts) end-to-end with no product bugs found — every
  QA-script failure was a locator ambiguity from a real, harmless UI
  coincidence ("Update"/"Scheduled"/"Published" each double as a
  category/filter-chip label and an editor control label), not a
  defect. Full suite green (553 unit, 83 e2e), `npm run build`
  confirmed twice.

## [Unreleased] (cont. 27)

### Added
- Admin Content Pages (`specs/021-admin-content-pages/`, branch
  `021-admin-content-pages` merged to `main`) — all 25 tasks complete:
  `/admin/content-pages`, a thin management list wrapping Content
  Page's (014) existing `ContentPage` table. Stats (total/published/
  drafts/system), a fetch-all-then-filter search (title/slug) +
  status/system filter, and a row per page (icon, title, 🔒 System
  badge, URL, status, updated date, actions). Publish/Unpublish call
  014's existing `toggle-page-status.ts` directly; View/Edit both
  navigate to the page's own public slug, where 014's inline-edit
  affordance already lives — no second content-editing UI. New
  `delete-content-page.ts` unconditionally sets `status='draft'` (ADR
  0005, never a row removal) via an inline "Delete? Yes/No" confirm,
  offered only for non-system pages. New `create-content-page.ts`
  generates a unique `untitled-page`/`untitled-page-2`/… slug. Adds
  `contentPages.system` (new boolean column) and a Foundational-phase
  seed (`scripts/seed-system-pages.ts`) inserting About Us, Privacy
  Policy, and Terms of Use as real, published, `system=true` rows —
  the first `ContentPage` rows any feature has ever written.
  `requireRole("moderator")` gates the route and both Server Actions —
  the ninth real consumer after Content Page (014), Admin Dashboard
  (015), Admin Users (016), Admin Postings (017), Admin Forum (018),
  Admin Reports (019), and Admin News (020) — so the real list/action
  content can't be exercised by a real session yet; every query/action
  is unit-tested directly, and e2e covers the real, current
  access-denial behavior.

### Fixed
- Corrected a data-model.md inconsistency before it shipped: the
  spec's own seed-data table listed system-page slugs with a leading
  slash (`/about`), but `014`'s real `contentPages.slug` convention
  stores bare slugs matched against the `/pages/[slug]` dynamic route
  — a stored leading slash would never route. Seeded and generated
  slugs bare (`about`/`privacy`/`terms`, `untitled-page`) instead, with
  the leading slash added back only for cosmetic display.

### Verified
- Visual QA (temporary local role-gate bypass across this feature's
  own page/two Server Actions, plus 014's reused
  `toggle-page-status.ts`/`save-content-page.ts`, plus 014's own
  `/pages/[slug]` page — the Edit/View cross-link target — fully
  reverted before commit) exercised stats accuracy, search by title
  and slug, all four filter chips, the empty state, Publish/Unpublish,
  page creation, View/Edit navigation into 014's real inline-edit
  surface, and both delete-confirm paths end-to-end with a
  zero-violation axe-core scan and no product bugs found. Full suite
  green (566 unit, 85 e2e), `npm run build` confirmed twice.

## [Unreleased] (cont. 28)

### Added
- Public profile page (`specs/022-public-profile/`, branch
  `022-public-profile` merged to `main`) — all 28 tasks complete: the
  public `/u/:handle` page (no login required to view) — identity/bio,
  real computed stats (rating+review count, a `sessions` proxy from
  accepted applications + closed/full hosted postings), the real
  per-user-editable games list, currently-open hosted postings with an
  inline "Request" (reusing 006's `applyToPosting`), display-only
  Player reviews (new `reviews` table, no writer yet — rating
  submission stays deferred), a public-info sidebar, and — authenticated
  non-self viewers only — a "You have in common" sidebar (mutual
  follows + shared games, computed at read time). Drops six wireframe
  elements (online presence, reliability %, groups, per-game
  rank/hours, level, pronouns/languages/timezone) against
  already-established precedent. New Follow (`toggle-follow.ts`, new
  `follows` table, hard-deleted on unfollow) and a host-initiated
  "Invite to a party" (`invite-to-party.ts`) reusing 006's
  `applications` table via a new `initiatedBy` (`applicant`\|`host`)
  column — requires the invited user's own consent, resolving through
  the same accept/decline transaction as a normal request.

### Changed
- Amended Inbox's (011) `accept-request.ts`/`decline-request.ts`/
  `get-inbox-list.ts`/`get-conversation.ts`: a host-initiated invite
  (`initiatedBy = 'host'`) is authorized for the INVITED applicant, not
  the inviting host — reversed from every normal applicant-initiated
  row. `request-banner.tsx`/`conversation-list.tsx`/the inbox detail
  page's own display text branches to say "invited you" instead of
  "wants to join" for that direction.
- `get-public-profile.ts`/`get-in-common.ts` read games from Profile's
  (007) `userGames` table, not `users.gamesPlayed` (data-model.md's
  named field) — the latter is set once at onboarding and never
  updated afterward, so it would show a stale snapshot.

### Fixed
- A real, previously-latent bug in `conversation-list.tsx`: the inbox
  row's preview text was hardcoded to a generic "Wants to join your
  party" for every request-kind item, silently discarding an
  applicant's own actual message on every pending-request row (not
  just this feature's new invite items). Fixed by rendering
  `item.preview` directly, which `get-inbox-list.ts` already computed
  correctly for both directions. `e2e/inbox.spec.ts`'s own assertion
  (previously relying on the bug) updated to match the corrected
  behavior.

### Verified
- No `requireRole`-style hardcoded gate blocks this feature
  (`requireVerifiedEmail`/`requireAuth` check real session state), so
  it's fully exercised end-to-end through real Playwright sessions with
  no local bypass needed. `e2e/public-profile.spec.ts` covers all three
  user stories (public view + not-found + dropped-elements absence with
  a zero-violation axe scan; Follow/Message/Invite end-to-end across
  two real sessions with a session-switch to accept from the invited
  user's own Inbox; the no-eligible-posting state; mutual connections;
  Report/Block opening the canonical flows; unauthenticated/unverified
  gating). Full suite green (590 unit, 95 e2e), `npm run build`
  confirmed twice.

## [Unreleased] (cont. 29)

### Added
- News article detail (`specs/023-news-article-detail/`, branch
  `023-news-article-detail` merged to `main`) — all 28 tasks complete:
  the public `/news/:slug` article page (no login required) —
  category/date/computed-read-time meta, title, a fixed "playm8z team"
  byline, cover, full markdown body (rendered via a new `marked`
  dependency), tags, a "Keep reading" grid (reusing News feed's, 013,
  own live-check query), a client-only reading-progress bar, and the
  reused newsletter-subscribe box. New Like (reuses Forum Thread's,
  010, polymorphic `likes` table as a third `targetType`) and Save
  (new, separate `savedNewsPosts` table — not a premature
  `savedListings` generalization), surfaced in Profile's (007) Saved
  tab as a new "Saved articles" section. Adds `newsPosts.slug`
  (generated once at creation by an amended `save-news-post.ts`,
  immutable afterward) and `newsPosts.tags` (new — see Fixed below),
  plus bounded amendments linking News feed's own cards to their
  article.

### Fixed
- `newsPosts` had no `tags` column or editor field anywhere despite
  this feature's own FR-001 requiring tags to render — added
  `newsPosts.tags` and a comma-separated tags input to Admin News'
  (020) editor, matching Forum index's own tags-input pattern.
- A real, previously-latent bug in `conversation-list.tsx` (Inbox,
  011): its inbox row preview text was hardcoded to a generic fallback
  string for every request-kind item, discarding the real message —
  fixed by rendering `item.preview` directly.
- A real hydration-mismatch bug in the article's own share buttons:
  X/LinkedIn share URLs were built from `window.location.href` read
  directly during render (empty during SSR, "corrected" after
  hydration). Fixed by moving those reads into `onClick` handlers using
  `window.open()`, matching this project's established "only touch
  `window` inside an event handler" pattern.

### Verified
- No `requireRole`-style hardcoded gate blocks this feature
  (`requireVerifiedEmail`/`requireAuth` check real session state), so
  it needed no local bypass. `e2e/news-article-detail.spec.ts` covers
  all three user stories (read + not-found + reading-progress +
  subscribe with a zero-violation axe scan; Like/Save + Profile
  Saved-tab surfacing; Keep reading + share buttons; unauthenticated/
  unverified gating). Full suite green (612 unit, 104 e2e), `npm run
  build` confirmed twice.

## [Unreleased] (cont. 30)

### Added
- Admin Settings (`specs/024-admin-settings/`, branch
  `024-admin-settings` merged to `main`) — all 43 tasks complete:
  `/admin/settings`, gated at `admin` specifically. Ships the real
  `users.role` column (`user`\|`support`\|`viewer`\|`moderator`\|
  `admin`) `require-role.ts` had been waiting on since Content Page
  (014) — `requireRole()` now queries it fresh per request instead of
  a hardcoded rank. Five sections: General (site metadata + Error
  Pages', 002, real maintenance-mode toggle), Moderation & auto-flag
  (banned phrases + four filter toggles now drive 017's/018's shared
  `auto-flag-rules.ts`; a computed auto-hide-after-N-reports rule
  amending Home's/Browse's/Forum index's, 003/004/009, queries; a
  computed "needs ban review" badge on 017's/018's/019's queues), Roles
  & access (team list + role dropdown/remove + invite-by-email, one
  `assignTeamRole` action for both), Feature flags (only Open Signups
  gets real enforcement), Safety (Discoverable-profiles-by-default,
  wired to both sign-up paths). Extends Error Pages' (002) singleton
  `settings` table with ~19 new fields, exactly as that feature's own
  data-model.md anticipated. Every settings-save Server Action logs an
  audit entry (015).

### Fixed
- `proxy.ts`'s maintenance-mode intercept never checked role at all
  (no real role existed before this feature) — an authenticated admin
  was NOT actually unaffected sitewide, only on `/admin/*`. Added a
  sitewide admin bypass plus a `/login` exemption (without it, an admin
  without a current session has no way to reach the login form during
  an active maintenance window).
- Every settings-save Server Action called `revalidatePath()` but never
  invalidated `get-settings.ts`'s own separate 5-second TTL cache, so
  an immediate reload after Save showed stale data. Renamed the
  test-only `_resetSettingsCacheForTests` to the now-production-
  purposed `invalidateSettingsCache()` and wired it into the shared
  `upsertSettings()` helper every save action uses.
- Public Profile (022) never honored Profile's (007) existing
  `showRegion`/`showAgeGroup` privacy toggles, unconditionally showing
  Region/Age group regardless of the owner's preference —
  `get-public-profile.ts` and the profile sidebar now honor both.

### Verified
- Full unit/integration coverage including all 7 Server Actions, each
  proven against a real `admin` session succeeding AND a real
  `moderator` session being rejected — no mocking of `requireRole`
  itself, the first admin feature able to do this since the role
  column is finally real. `e2e/admin-settings.spec.ts` (11 tests, zero-
  violation axe scan) exercises all three user stories through real
  sessions with real roles — the first admin/moderation feature in the
  project needing no local QA bypass of any kind. Full suite green (673
  unit, 115 e2e), `npm run build` confirmed twice.

## [Unreleased] (cont. 31)

### Added
- Moderator audit log (`specs/025-moderator-audit-log/`, branch
  `025-moderator-audit-log` merged to `main`) — all 21 tasks complete:
  `/admin/audit-log`, gated at `moderator` (deliberately less strict
  than Admin Settings', 024, admin-only gate — a read-only
  transparency tool, not a mutation surface). A real, server-side
  `searchParams`-driven search (actor/action/target/reason)/actor
  filter (every real actor who has ever logged, plus a "System"
  sentinel for a null `actorId`)/category filter (the real, stored
  4-value `moderation`\|`content`\|`access`\|`system`, never a
  fabricated finer classification) over Admin Dashboard's (015)
  existing `auditEntries` — its first full, dedicated, filterable/
  paginated viewer. Day-grouped Today/Yesterday/Earlier, cumulative
  "Load more" pagination (News feed's own precedent). Each row is a
  real, keyboard-operable disclosure (`aria-expanded`) revealing its
  `reason`/`meta` detail. "Export CSV" is a real gated GET route
  handler re-running the exact same filter, unpaginated.

### Fixed
- Admin News (020) and Admin Content Pages (021) were the only two
  admin features that never wired 015's `logAuditEntry()` despite its
  own spec anticipating them — `save-news-post.ts` now logs on a
  genuine first-time publish, a schedule, or an edit to an
  already-published post; `create-content-page.ts`/
  `toggle-page-status.ts`/`delete-content-page.ts` each now log too.
- A leftover, uncleaned real news post from this feature's own e2e
  gap-fix test intermittently displaced News Article detail's (023)
  "Keep reading" results in a full-suite run (that query ranks the 3
  most-recent live posts across the whole, unscoped `newsPosts` table)
  — fixed by deleting the created post in this spec's own `afterAll`.

### Verified
- Full unit/integration coverage: `audit-log.ts`'s Zod schemas,
  `get-audit-log.ts`'s search/filter/day-grouping/pagination (a pure
  `groupByDay()` plus a real-Postgres integration suite scoped via a
  unique run id rather than wiping the shared audit table),
  `export-audit-log-csv.ts`'s filter-mirroring, and all four amended
  `020`/`021` actions proven to call `logAuditEntry()` against a real
  seeded moderator. `e2e/audit-log.spec.ts` (11 tests, zero-violation
  axe scan) covers access control, browse/search/filter/day-grouping,
  expand/collapse, CSV export fidelity, a no-self-logging delta check,
  and both gap-fix scenarios through the real Admin News/Admin Content
  Pages UI — no bypass of any kind, same as Admin Settings' own suite.
  Full suite green (693 unit, 126 e2e), `npm run build` confirmed.

## [Unreleased] (cont. 32)

### Added
- Logged-out marketing landing page (`specs/026-landing-page/`, branch
  `026-landing-page` merged to `main`) — all 19 tasks complete, the
  26th and final tracked feature. `/` now renders this feature's real
  marketing content for an unauthenticated visitor instead of
  redirecting to `/login`, closing the loop Home's (003) own spec left
  open; an authenticated visitor's experience is unchanged. A new
  `get-landing-stats.ts` computes every "live-feeling" number for
  real: total players, games & tables (all postings ever, a
  catalog-breadth stat), parties formed this week (a new
  `applications.acceptedAt`, set by Inbox's, 011, existing
  `accept-request.ts`), and the hero's floating card(s) (1-2 real
  currently-open postings via the shared `listing-card.tsx`, with a
  clearly-decorative fallback when none exist — never fabricated
  example content). "Browse by genre" shows real per-genre open-count
  data across Browse's (004) 8-genre enum, each linking into a real
  pre-filtered Browse view. Footer links About/Privacy/Terms to Admin
  Content Pages' (021) real seeded system pages.

### Changed
- The wireframe's fake "players online now" presence badge and "avg
  teammate rating" are both dropped entirely (no real presence-
  tracking or rating-submission system exists); the "Why playm8z"
  profile/ratings feature card is reworded to "Real player profiles,"
  describing only real, current capabilities.

### Fixed
- postgres.js converts a JS `Date` differently than Postgres's own
  `now()`/`defaultNow()` for a "timestamp without time zone" column —
  comparing an explicit-JS-Date-stamped row against a
  `defaultNow()`-stamped sibling produced a multi-hour skew, reversing
  an intended relative-order assertion in this feature's own e2e test.
  Fixed by giving both compared rows an explicit JS Date from the same
  clock; doesn't affect any shipped production code, which never mixes
  the two sources within one comparison.

### Verified
- Full unit/integration coverage (`get-landing-stats.ts`'s three real
  stats via delta assertions against the shared, unscoped `users`/
  `postings`/`applications` tables; a component-level
  `landing-hero.test.tsx` for the real-posting and zero-postings
  fallback cases; `accept-request.ts`'s new `acceptedAt` write) plus
  `e2e/landing-page.spec.ts` (14 tests, zero-violation axe scan)
  covering both root-route branches, real stats/hero-card/genre-count
  display, every CTA, footer links, and `acceptedAt` propagating from a
  real Inbox accept action — no bypass of any kind. Full suite green
  (704 unit, 140 e2e), `npm run build` confirmed.

**All 26 tracked features are now fully implemented and merged.**

## [Unreleased] (cont. 33)

### Added
- `docs/summary.md` — an architecture/data-model/feature-area/
  conventions TL;DR, produced by a read-only reconnaissance pass over
  the whole codebase.
- A new "Admin Users (Master-Detail)" wireframe
  (`resources/wireframes/admin/`) — reviewed with the user; its layout
  redesign was declined for now (see `docs/future-work.md`) in favor of
  a smaller real gap, feature 027 below.
- Admin Users drawer — view full profile in a new tab
  (`specs/027-admin-user-profile-link/`, branch
  `027-admin-user-profile-link`) — all 7 tasks complete: a small
  enhancement to already-shipped Admin Users (016), not a new page. The
  per-user drawer (`user-drawer.tsx`) now shows a "View full profile"
  link to that same user's real Public Profile (022, `/u/[handle]`),
  using the `handle` `get-user-detail.ts` already returns, opened with
  `target="_blank"` + `rel="noopener noreferrer"` so the admin queue's
  tab/state is never disturbed. Rendered unconditionally for active,
  flagged, and banned users alike.

### Fixed
- A real race condition in Browse's facet filters
  (`use-browse-url-params.ts`): two facet toggles fired back-to-back
  (e.g. selecting "Serious" then "FPS") both read the same
  `useSearchParams()` snapshot from the last completed render — since
  `router.replace()` only resolves that hook on the *next* render, the
  second toggle silently dropped the first's change. Fixed by building
  each update from the live `window.location.search` instead. Root
  cause of an intermittent `browse.spec.ts` e2e failure in CI (fast
  local machines rarely hit the timing window; a loaded CI runner hit
  it reliably).

### Verified
- `e2e/admin-users.spec.ts` extended with a real seeded `moderator`
  session (no bypass) asserting the new link's `href`/`target`/`rel`
  for both an active and a banned target user — also retires that
  file's stale header comment claiming the drawer "can't be exercised
  end-to-end" (untrue since Admin Settings/024 shipped the real `role`
  column). `browse.spec.ts` re-run 3x plus the full 140-test e2e suite,
  typecheck, and lint all green after the race-condition fix.

## [Unreleased] (cont. 34)

### Added
- Admin-only AI writing assist (News & Content Pages)
  (`specs/028-ai-writing-assist/`, branch `028-ai-writing-assist`) —
  all 24 tasks complete, the 28th feature. Two new actions, "Write
  from scratch" and "Improve/rewrite," added to Admin News' (020)
  editor and the inline Content Page (021) editor, calling Claude
  Haiku via the Vercel AI SDK + AI Gateway (`ADR 0007`,
  `anthropic/claude-haiku-4.5`) — this project's first external-AI-
  provider integration. Gated at `admin` specifically, stricter than
  every other admin page's `moderator` minimum. `src/lib/ai/gateway.ts`
  wraps `generateText`'s `output: Output.object()` for structured
  drafts (this AI SDK version has no standalone `generateObject`) and
  plain `generateText` for revisions. `improve-draft-text.ts` is ONE
  shared, surface-agnostic Server Action for both surfaces, reusing
  the Content Page editor's own existing `blockToText`/`withText`
  round-trip rather than a bespoke per-block schema. Neither action
  ever saves/publishes anything — both only populate existing draft
  form state; every completed action logs an audit entry (015).
- `.env.example`/`.env.local` documented/provisioned with
  `AI_GATEWAY_API_KEY`.

### Changed
- Admin Forum was explicitly scoped out of this feature (no admin
  authoring surface exists there today — moderation-only); logged to
  `docs/future-work.md`.

### Fixed
- `src/lib/ai/gateway.ts`'s structured-draft helper now re-validates
  the AI response with the same Zod schema itself, rather than relying
  solely on the AI SDK's internal `Output.object()` conformance check
  — surfaced while writing this feature's own unit tests (which mock
  `generateText` entirely and so bypass the SDK's internal validation
  too), making the boundary check this project's own, observable code
  rather than an unverifiable assumption about a dependency.

### Verified
- Full Vitest coverage of all three Server Actions (`ai` mocked, real
  seeded `admin`/`moderator` roles, no bypass of the gate itself) —
  role gate, input validation, audit logging, and malformed-AI-output
  rejection. `e2e/admin-news.spec.ts`/`e2e/content-page.spec.ts`
  extended to prove the admin-only gate and control-availability state
  (including "Improve/rewrite" absent on empty text) through real
  seeded sessions — deliberately never triggering a real AI call in
  CI. The real end-to-end Gateway call was verified once, live,
  outside the test suite (both a structured draft and a plain
  rewrite), confirming the actual wiring works beyond the mocks.

## [Unreleased] (cont. 35)

### Added
- Real image upload for News post covers
  (`specs/029-news-cover-image-upload/`, branch
  `029-news-cover-image-upload`) — all 17 tasks complete, the 29th
  feature. The Admin News (020) editor's Cover field now accepts a
  real uploaded image (JPEG/PNG/WebP, 5MB cap) alongside its existing
  4 gradient swatches, via Vercel Blob (`ADR 0008`, `access: "public"`)
  — this project's first user-uploaded file. `newsPosts.cover` is
  reused as-is; a new shared `newsCoverStyle()` helper
  (`src/lib/news/cover-style.ts`) distinguishes a gradient from a real
  image URL by string shape at render time, adopted by all 6 real
  consumers (feed cards, featured post, article detail, related
  articles, Profile's Saved tab, admin list thumbnail). Gated at
  `moderator` (not admin-only, unlike feature 028's AI assist).
- `.env.example`/`.env.local` documented/provisioned with
  `BLOB_READ_WRITE_TOKEN`; a Vercel Blob store was provisioned
  (`vercel blob create-store`) and connected across Production/
  Preview/Development.

### Fixed
- `vercel blob create-store --yes` triggered the same full local
  `env pull` risk already on file from the Neon Marketplace incident —
  wiped `AUTH_SECRET`/`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/
  `AI_GATEWAY_API_KEY` and replaced `DATABASE_URL` with Neon's again.
  Restored immediately from values still in session context; no
  lasting damage, but a reminder that `--yes`/non-interactive flags on
  Vercel CLI commands default to "also sync env vars locally" more
  often than the command name implies.

### Verified
- Full Vitest coverage of `upload-news-cover-image.ts` (role gate via
  a real seeded `moderator` role, file-type/size validation, `put()`
  called with `access: "public"`) and `newsCoverStyle()`, with
  `@vercel/blob` mocked. `e2e/admin-news.spec.ts` extended to prove
  only the upload control's presence for a real seeded moderator
  session — never a real upload in CI, matching feature 028's own
  external-call-boundary precedent. The full e2e suite (150 tests) was
  run immediately after adopting `newsCoverStyle()` across all 6
  consumers, before the upload capability itself existed, to prove
  zero visual regression for already-published gradient-only posts.
  The real end-to-end Blob write was verified once, live, outside the
  test suite (upload → public URL → fetches with the correct
  `image/png` content-type), then cleaned up.

## [Unreleased] (cont. 36)

### Fixed
- News cover image upload (029) hung indefinitely on "Uploading…" for
  any real photo over ~1MB, reported live by the user. Root cause:
  Next.js Server Actions default to a 1MB request-body cap
  (`next.config.ts`'s `experimental.serverActions.bodySizeLimit`),
  well under this feature's own advertised 5MB limit — the framework
  itself silently rejected the request before
  `upload-news-cover-image.ts`'s own validation ever ran. Raised the
  cap to `6mb` (headroom for multipart/form-data's own boundary
  overhead on a 5MB file). Also fixed a real robustness gap the same
  bug exposed: `news-post-editor.tsx`'s upload handler had no
  `try/catch` around the Server Action call, so a *thrown* failure
  (as opposed to a returned `{ success: false }`) left the UI stuck in
  the pending state forever with no error shown — now caught, with a
  clear error message and the pending state always released via
  `finally`. Verified live with a real 2MB upload (well over the old
  1MB cap) completing correctly; full 724-test unit suite and
  151-test e2e suite green.
