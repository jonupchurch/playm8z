# Status

**Phase**: All 26 originally-tracked features are implemented and
merged: Auth & Onboarding, Error Pages, Home, Browse, Post a Game,
Listing detail, Profile + Account settings, Blocked Users, Forum
index, Forum Thread, Inbox/messaging, Notifications + Report modal,
News feed, Content Page, Admin Dashboard, Admin Users, Admin Postings,
Admin Forum, Admin Reports, Admin News, Admin Content Pages, Public
profile page, News article detail, Admin Settings, Moderator audit
log, and the Logged-out marketing landing page. The project-wide
feature list is complete — future work is iteration (bug fixes,
refinements, revisiting `docs/future-work.md`'s deferred items) rather
than new ground-up features. Feature 27 (Admin Users drawer — view
full profile in a new tab) shipped as exactly that kind of iteration,
a small enhancement to already-shipped feature 016. Feature 28
(Admin-only AI writing assist) is this project's first genuinely new
top-level feature since the original 26 — this project's first
external-AI-provider integration. Feature 29 (real image upload for
News covers) is this project's first user-uploaded-file capability,
via Vercel Blob. Features 30-36 continued the iteration line (admin
genres, admin suggested games, posting age ranges, password reset,
profile images, game images, game typeahead). Feature 37 (Messages in
the top nav with an unread badge) surfaces the already-built inbox
(011) as a first-class nav entry beside the notification bell —
closing a discoverability gap, not adding a messaging capability.
Feature 38 (Connect Steam & import game library) is the first
third-party account LINK — a settings-time Steam OpenID connect
(verified server-side, ADR 0012), NOT a sign-in method — that imports
a player's real Steam library into their profile. Feature 40
(notification wiring, ADR 0013) finally connects feature 012's
`createNotification()` to real events — forum replies, @mentions, and
applicant-facing accept/decline — best-effort so a notification
failure never breaks its primary action; the host's inbound-request
view stays live-synthesized and DMs stay on the Messages badge (037).
Feature 41 (owner-only news hard-delete, ADR 0014) adds an `isOwner`
account marker — orthogonal to `role`, so the role hierarchy is
untouched — that unlocks a permanent-delete of a news post, a scoped,
audit-logged exception to ADR 0005; the misleading "Delete" button is
relabeled "Unpublish". Also this session: a standing workflow where a
user-facing CHANGELOG entry publishes a "Patch Notes" news post to prod
via `scripts/publish-patch-note.ts`. Feature 42 (unify player games,
ADR 0015) makes `userGames` the single source of truth — onboarding
reconciles into it instead of the now-retired `users.gamesPlayed`, and
a seed-empty-only backfill recovered pre-fix players — fixing the bug
where onboarding game picks never reached the profile or matching.
**Last updated**: 2026-07-17

## Where things stand

- Next.js app scaffolded (App Router, TypeScript strict, Tailwind CSS,
  `src/` layout, npm), merged into the existing repo without disturbing
  the pre-existing `resources/design/` and `resources/wireframes/`
  design comps or the original `README.md`/`LICENSE`.
- Drizzle ORM wired to a local PostgreSQL 15 instance: database
  `playm8z` created, Auth.js's adapter schema (`user`, `account`,
  `session`, `verificationToken`) migrated in, `user` extended with a
  `passwordHash` column for native login.
- Auth.js v5 wired: Google OAuth + Credentials (native email/password)
  providers, `@auth/drizzle-adapter`, JWT sessions (required alongside
  Credentials), route handler live at `/api/auth/[...nextauth]`. No
  sign-in/sign-up UI built yet — this is machinery, not a feature. (A
  wireframe now exists for this — "Auth & Onboarding" — see below.)
- Zod installed and used for the Credentials-provider input schema
  (`src/lib/validations/auth.ts`) — the pattern to extend to future
  trust boundaries per the constitution's Principle II.
- GitHub Spec Kit installed (Claude Code integration, PowerShell
  scripts) — `.specify/` and `.claude/skills/speckit-*` match the
  sibling project InterruptVector's setup.
- **Constitution ratified** (`.specify/memory/constitution.md`,
  **v1.0.0**, ratified 2026-07-12) — structural process principles;
  playm8z's actual full MVP scope beyond that is captured informally in
  `resources/guidelines.md`/`status.md`/`docs/adr/`, formalized
  feature-by-feature via `/speckit-specify`. Amended six times before
  ratification, all on 2026-07-12: a git branching rule (feature
  branches via Spec Kit's own hook, merged to `main` on completion, no
  PR review needed solo) and a feature-granularity default (roughly one
  feature per wireframed page); strengthening "specify→plan→tasks
  before implementation" from a per-feature gate into a
  **project-wide** one; closing out Principle V's test-framework gap;
  syncing Technology Constraints with the actual Vercel/Neon/CI setup;
  then ratification itself.
- `.gitignore` copied from InterruptVector and committed by itself
  (commit `53cb372`). The full scaffold (app/db/auth/Spec Kit/draft
  constitution) is committed as `d3b9039`.
- **Vercel project linked** (2026-07-12): `jupchurch-7994s-projects/playm8z`,
  linked via `vercel link` (creates local `.vercel/`, gitignored).
  **Neon Postgres provisioned via Vercel Marketplace**
  (`vercel integration add neon`) — resource `neon-coral-chair`, connected
  to the project; `DATABASE_URL`/`DATABASE_URL_UNPOOLED` and the Neon/
  `PG*`/`POSTGRES_*` vars are set on Vercel for Production/Preview/
  Development. Schema pushed to Neon (`drizzle-kit push` against the
  unpooled URL) — `user`/`account`/`session`/`verificationToken` tables
  confirmed live there. `AUTH_SECRET` generated and set on Vercel for
  Production and Preview (separate value from the local one).
  **Local dev intentionally stays on local Postgres, not Neon** (user's
  choice) — the Marketplace install's automatic `vercel env pull`
  overwrote `.env.local` with the Neon dev vars, wiping the local
  `DATABASE_URL`/`AUTH_SECRET`; restored `.env.local` to the local
  Postgres connection string (confirmed working) plus a freshly
  generated local `AUTH_SECRET`. Custom domain (playm8z.com)
  deliberately not connected yet, per the user's choice — the project
  is deployed to its default `https://playm8z.vercel.app` production
  domain for now.
  Also: `vercel integration add neon` auto-installed Neon's Claude Code
  skills (`.claude/skills/neon`, `.claude/skills/neon-postgres`) as
  absolute-path symlinks into `.agents/skills/` — gitignored rather than
  committed, since absolute symlinks break on a different clone path and
  Git-on-Windows often mishandles symlinks on checkout; re-run the same
  `vercel integration add neon` (or `npx skills add
  https://github.com/neondatabase/agent-skills`) to reinstall locally if
  needed on another machine.
- **First production deploy done** (2026-07-12, by the user, outside
  this session): `https://playm8z.vercel.app` is live and serving
  (verified `200 OK`), running against the Neon database provisioned
  above.
- **Google OAuth configured and verified working, locally and in
  production** (2026-07-12): client created in Google Cloud Console
  (Testing publish status — test users must be added there for anyone
  besides the owner to sign in), with both
  `http://localhost:3000`/`.../api/auth/callback/google` **and**
  `https://playm8z.vercel.app`/`.../api/auth/callback/google`
  registered as origins/redirect URIs. `AUTH_GOOGLE_ID`/
  `AUTH_GOOGLE_SECRET` set in `.env.local` and on Vercel (Production +
  Preview). Verified end-to-end on both: hitting `/api/auth/signin/google`
  (POST with a valid CSRF token) correctly redirects to Google's real
  consent screen with the right `client_id`/`redirect_uri` for each
  environment.
- **Vitest + Playwright installed** (2026-07-12), matching the sibling
  project's exact setup (`vitest.config.ts`/`vitest.setup.ts`,
  `playwright.config.ts`, `e2e/` dir, `test`/`test:watch`/`test:e2e`
  npm scripts). A real unit test suite
  (`src/lib/validations/auth.test.ts`) covers the existing
  Credentials-provider Zod schema (valid input, bad email, short
  password, missing fields) — 4 tests, all passing. A placeholder e2e
  smoke test (`e2e/smoke.spec.ts`) checks the home page loads, standing
  in for Principle V's full-vertical-slice e2e test until a real
  feature exists. Both verified running locally.
- **CI wired up** (2026-07-12): `.github/workflows/ci.yml` — GitHub
  Actions, triggers on every push and every PR. Steps: checkout →
  Node 24 (matches Vercel's project setting) → `npm ci` → typecheck →
  lint → `drizzle-kit push --force` (schema onto an ephemeral Postgres
  15 service container, not a real database) → `npm test` (Vitest) →
  install the Playwright chromium browser → `npm run test:e2e`. Uses
  hardcoded CI-only placeholder values for `AUTH_SECRET`/
  `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (not real secrets, no GitHub
  Secrets configuration needed) — sufficient for the app to boot; no
  real Google OAuth flow or authenticated session is exercised by the
  current test suite. On failure, uploads the Playwright HTML report as
  a workflow artifact. Verified the full flow locally first: pushed the
  schema to and built the app against a throwaway local database with
  the same placeholder env vars, confirming the app boots without real
  Google credentials, before trusting it in Actions. Satisfies
  Principle V's "CI MUST run typecheck, lint, and test on every push"
  — note this triggers CI, it doesn't yet enforce a required check on
  branch protection (GitHub branch protection rules aren't configured
  — not really actionable solo without collaborators to protect against).
  **Confirmed live on GitHub Actions**: first run (triggered by the
  commit that added the workflow) went fully green — every step
  (checkout, setup-node, `npm ci`, typecheck, lint, Drizzle push,
  Vitest, Playwright browser install, Playwright e2e) succeeded on the
  first try, no fixes needed.

## Known gaps / accepted limitations

- No sign-up flow exists to actually create a Credentials-provider user
  (with a `passwordHash`) — the schema and auth config support it, but
  no route/UI does yet.
- No custom domain connected — live at `https://playm8z.vercel.app`
  only, per the user's choice (deliberately deferred, not a gap).

## Product vision (informal, not yet a spec)

`resources/guidelines.md` (added 2026-07-12, Claude-Design-generated) is
now the authoritative context document tying the whole wireframe set
together: product overview, design system token reference, suggested
data models, full information architecture/route map, and a per-screen
spec (purpose/layout/interactions/data) for every wireframed page,
public and admin. It explicitly recommends the same approach already
chosen here — one `/speckit-specify` spec per feature area, mirroring
its per-screen sections — and lists what still has no design at all
(§10): Groups/Clans, a logged-out marketing landing page, post-session
rating/review, Discord connect, admin Settings, mod audit log,
ban-appeals queue, 404/error pages, mobile-specific layouts. Its
recommended tech stack section (§3) is superseded by what's already
built here (Next.js/Drizzle/Postgres/Auth.js) — read the rest, ignore
that section.

`resources/wireframes/` currently has: Home, Browse, Post a Game, Forum,
Forum Thread, Listing (single LFG listing detail view), Inbox
(messages), Profile, News (public news feed), Content Page (public
admin-authored page), and Auth & Onboarding (sign-in/sign-up + a
post-signup onboarding flow) — plus
`resources/wireframes/support/Notifications & Report.dc.html`. Seven
admin pages live under `resources/wireframes/admin/`: Admin Dashboard,
Admin Forum, Admin News, Admin Postings, Admin Users, Admin Content
Pages, Admin Reports. Also a Dark/Light theme + style guide in
`resources/design/`.

`resources/sitemap.md` (also added 2026-07-12) cross-confirms the same
IA/route map as guidelines.md §6, plus a couple of undesigned pages
guidelines.md didn't call out on its own (now folded into
`docs/future-work.md`): a public profile page (`/u/:handle`), a news
article detail page (`/news/:slug`), and password reset. It also
resolves the "Design System"/"Brand Identity" file question from
earlier: its status summary lists both as **designed** (they exist in
the design tool) but neither was copied into `resources/design/` in
this repo — only the Dark/Light Theme sheets were. Worth asking the
user whether to pull those two in as well, or treat guidelines.md §4's
distillation as sufficient.

"Groups" and the rest of the not-yet-designed list live in
`docs/future-work.md`.

**Decision (ADR 0001, `docs/adr/0001-game-as-free-text-keyword.md`):**
`game` is a free-text/keyword field, not a curated `Game` catalog entity.
No admin Games-management page — Browse's keyword search/filter over
postings is what satisfies "browse games." A per-game hub page
(`/games/:slug`) is parked as maybe-later (`docs/future-work.md`), same
non-committed status as Groups. This supersedes `guidelines.md` §5's
suggested `Game` entity and `Posting.gameId` foreign key.

`resources/wireframes/support/playm8z - Error Pages.dc.html` (added
2026-07-12) designs 404, 500, 403, and a maintenance/down page — closes
that item on the not-yet-designed list.

Loading/pending/fetch-error states (page-load skeletons, in-flight
filter/search, pending submit buttons, submit success/error) are now
specified too, per the user's direction to handle them as a reusable
design-system pattern rather than per-page wireframes —
`resources/guidelines.md` §4.6.

`resources/wireframes/support/playm8z - Blocked Users.dc.html` (added
2026-07-12) designs the blocked-users list/search, block flow (pick user
→ confirm, with an "also report" option), and unblock confirmation —
resolving that gap from the second business-requirements pass below.

**Second gap-analysis pass (2026-07-12), all resolved:**
- **ADR 0002** (`docs/adr/0002-minimum-age-18-plus.md`): playm8z is 18+
  only, at least on paper — the 13+ age tier is dropped entirely.
  `ageGroup` is `18|21`, not `13|18|21`; 21+ remains an optional stricter
  tag a host can apply, not a platform-wide minimum. Supersedes
  `guidelines.md` §5's `ageGroup(13|18|21)`. The Auth & Onboarding and
  Browse/Post-a-Game wireframes' age-related controls need a small
  revision to drop the 13+ option — not yet done.
- **ADR 0003** (`docs/adr/0003-posting-30-day-expiration.md`): a
  `Posting` auto-expires 30 days after creation unless manually closed
  or renewed (renew resets the window). No wireframe shows a "Renew"
  action yet — needs a small addition alongside the existing
  Close/Reopen actions on Profile → My postings.
- **Recurring session = descriptive only.** Confirmed: the `recurring`
  toggle on Post a Game is purely informational, not a scheduling
  engine — no auto-repost/instance-generation logic needed.
- **Post-session rating, monetized/premium accounts** — both confirmed
  explicit future-state features, not current scope. See
  `docs/future-work.md`.
- **Notification email scope narrowed**: only the registration/
  verification email is in scope now; every other notification type
  stays in-app-only. See `docs/future-work.md`.
- **Email verification** — design/implementation delegated to me by the
  user rather than specified; still needs an email-provider choice and
  a decided UX (what's gated pre-verification). See
  `docs/future-work.md`.

**Third gap-analysis pass (2026-07-12), all resolved:**
- **Steam & Discord social login are both future state.** The Auth &
  Onboarding/Profile wireframes show a working Steam login and
  "connected" state, but only Google OAuth + Credentials are actually in
  scope/built. See `docs/future-work.md`.
- **ADR 0004** (`docs/adr/0004-roster-slots-are-generic.md`): no
  structured role-matching on roster slots — the Listing wireframe's
  example role labels ("Entry / Initiator," "Flex") are flavor content,
  not a feature. A posting's description and an applicant's free-text
  message are what convey fit; the host accepts into any open generic
  seat. Supersedes `guidelines.md` §5's `RosterSlot.role` as a
  structured field.
- **Posting auto-flips to `full`** once all slots are accepted (not just
  applied-for) — confirms/extends ADR 0003's expiration model with the
  other half of the status lifecycle.
- **Blocking mid-conversation**: the existing conversation gets hidden
  and frozen (not deleted), so it stays reviewable by admins later if
  needed.
- **Admin ability to view a user's full activity** (messages, posts,
  interactions) — raised alongside the above, explicitly future state,
  not current scope. See `docs/future-work.md`.
- **Ban is permanent**, no timed-suspension tier. Appeals happen via
  Discord, not an in-app appeals queue — resolves what had been an open
  "ban-appeals queue" not-yet-designed item; it isn't undesigned, it's
  intentionally not an in-app feature.

**Reversed (2026-07-12, later same day):** the logged-out marketing
landing page turned out to need bespoke design after all —
`resources/wireframes/playm8z - Landing.dc.html` is a real marketing page
(hero, stats, three-step explainer, genre browse, testimonials, CTA),
well beyond the block-based Content Page editor. It's its own feature in
`docs/feature-list.md` now, not a `ContentPage`. Groups re-confirmed as
future state (no change).

**Five more wireframes landed (2026-07-12):** Public Profile, News
Article, Admin Settings (turned out to have real substance: General/
maintenance mode, moderation & auto-flag rules, roles & access, feature
flags, safety), Moderator Audit Log, and the Landing page above — all
moved into `docs/feature-list.md`'s "wireframed, ready to spec" list.

**Fourth gap-analysis pass (2026-07-12), all resolved:**
- **Hosts can remove an accepted roster member** (e.g. a no-show/flake),
  freeing that slot back up — resolves the roster-removal question left
  open from the third pass.
- **ADR 0005** (`docs/adr/0005-no-hard-deletes.md`): nothing is ever
  hard-deleted, platform-wide — every "delete"-shaped action (user
  account, posting, forum thread/reply, content page, etc.) is a
  disable/soft-delete instead, retained for moderation/audit and to
  avoid orphaned references. Generalizes the already-decided
  blocked-mid-conversation-freeze and permanent-ban behaviors into one
  stated principle.
- **`reliabilityPct` deferred to future state** — no mechanism exists to
  compute it yet (would depend on rating, already deferred, and/or
  no-show tracking); leave it out of the MVP profile display. See
  `docs/future-work.md`.
- **No editing a posting once an applicant has been accepted.** Before
  that, the host can edit freely; once someone's accepted onto the
  roster, the listing is locked. (Whether removing the last accepted
  member re-opens editing wasn't addressed — don't assume either answer
  if it comes up.)
- **Handle/username rules**: must be unique; letters and numbers only,
  must start with a letter; max 24 characters; cannot be changed once
  registered (allowing a later change is a possible future state, not
  committed — see `docs/future-work.md`). Applies at the Zod validation
  boundary per the constitution's Principle II.

**Feature list confirmed (2026-07-12):** `docs/feature-list.md` tracks the
~22-26 features against the constitution's project-wide spec/plan/tasks
gate — every one needs a complete spec.md/plan.md/tasks.md before
implementation begins on *any* of them. Design System / shared UI
primitives is exempt (infrastructure, built directly, like the initial
scaffold — user confirmed). Four more wireframes are actively in
progress, not deferred: public profile page, news article detail, Admin
Settings, and Moderator audit log (moved out of `docs/future-work.md`).

**`guidelines.md`/`sitemap.md` regenerated (2026-07-12)** to fold in all
7 newly-wireframed pages (Landing, News Article, Public Profile, Blocked
Users, Error Pages, Admin Settings, Admin Audit Log) as a new §12
"Additional screens" section, with updated IA/route map and file→feature
map. Two things surfaced from that pass, both resolved same day:
- The Public Profile wireframe's **new scope** (a **Follow** toggle —
  social graph, distinct from blocking; a host-initiated **"Invite to a
  party"** action, distinct from applicant-initiated "Apply for a slot";
  a "You have in common" mutual-connections sidebar) is **confirmed in
  scope** by the user — see `docs/feature-list.md`.
- `guidelines.md` §4.6 ("Loading & error patterns," dropped by the
  regeneration since it wasn't sourced from any wireframe) was
  **re-added by hand**, with a note in the file itself flagging that it
  won't survive a future regen automatically.

**Sweep for open items (2026-07-12)**, at the user's request — resolved:
- **Constitution ratified** — see above.
- **First `/speckit-specify` scope decided**: Auth & Onboarding, since
  it's foundational and blocks nearly everything else (posting,
  applying, messaging all assume a logged-in user). Now in progress —
  see Next up.
- **Design System / Brand Identity design files**: user confirmed
  pulling the design-tool source files into `resources/design/`
  (alongside the already-present Dark/Light Theme sheets). I can't
  generate/fetch these myself — they come from the same external design
  tool that's produced every other `.dc.html` file this session, so
  this is waiting on the user to export/drop them in, same as every
  other wireframe.

Still-open minor sub-questions, deliberately left unresolved (not urgent
— surface if a relevant `/speckit-plan` touches them, don't assume
either answer): whether freeing an accepted roster member re-opens
editing on that posting; whether a `scheduledDate` further out than 30
days extends a posting's expiry; whether Profile's "deactivate" and
"delete" stay two distinct user-facing actions or collapse into one.

**Auth & Onboarding: spec + plan done** (2026-07-12, branch
`001-auth-onboarding`, `specs/001-auth-onboarding/`). Two things
surfaced worth recording:
- **No git-branch-creation hook is actually wired up** in this repo
  (no `.specify/extensions.yml`), despite the constitution describing
  branch creation as automatic via a Spec Kit hook. Branches need
  creating by hand (`git checkout -b NNN-short-name`) before running
  `create-new-feature.ps1`, for this and every future feature.
- **Resend (email provider for verification emails) is picked but not
  provisioned** — Vercel Marketplace requires a domain you own to send
  from, and no domain exists yet (the custom-domain question was
  separately deferred). Not a design gap: the plan includes a
  console-log fallback (research.md #1) so the feature is fully
  buildable/testable now; Resend gets wired up for real once a domain
  exists.

**Auth & Onboarding: tasks done** (2026-07-12) — `tasks.md` generated,
40 tasks: Setup (1) → Foundational (7, schema migration + shared
validations/email-abstraction/auth-form shell) → US1/P1 sign-up +
onboarding (17, the MVP slice) → US2/P2 login (6) → US3/P3 skip-onboarding
(3) → Polish (6, including the unverified-email write-action gate
helper — built as a ready-to-call function since no write-action route
exists yet to consume it). `docs/feature-list.md` updated to 🟢. This is
the first feature to have a complete spec/plan/tasks trio.

**Workflow decision**: each feature branch merges to `main` right after
its spec/plan/tasks are complete (no PR needed, solo project), instead
of all ~26 branches staying open until the whole gate is satisfied.
`001-auth-onboarding` merged to `main` under this rule (fast-forward,
no conflicts). Keeps the tracking docs coherent throughout the
spec-writing phase.

**Error Pages: spec done** (2026-07-12, branch `002-error-pages`,
`specs/002-error-pages/`) — 404/500/403/maintenance as four states of
one shared component (`support/playm8z - Error Pages.dc.html`),
prioritized 404 > 500 > 403 > maintenance by real-world frequency. Real
HTTP status codes per state; an access-check-before-existence rule so
an unauthorized visitor can't tell a real `/admin/*` route from a fake
one via 403 vs. 404; the maintenance flag itself is left to the
not-yet-spec'd Admin Settings feature — this spec only defines what
happens when it reads as "on."

**Error Pages: plan done** (2026-07-12) — reading the actual installed
Next.js 16 docs (per AGENTS.md) surfaced its native mechanism for all
four states (`not-found.tsx`, `error.tsx`+`global-error.tsx` using
auto-generated `error.digest` as the reference code, `forbidden.tsx`+
`unauthorized.tsx` behind `experimental.authInterrupts`), which is *why*
spec.md's FR-008 got corrected first (403-for-both → 401/403 split,
same shared visual page) — the framework already does the more-correct
thing for free. Added a minimal `settings` table for the maintenance
flag, read-only for this feature and owned by the future Admin Settings
feature; read via `proxy.ts` with a short-TTL cache.

**Error Pages: tasks done** (2026-07-12) — `tasks.md`, 23 tasks: Setup(1)
→ Foundational(5) → US1/P1 404(3) → US2/P2 500(4) → US3/P3 401/403(4,
unit-level only — no real gated route exists yet to drive a live e2e
test) → US4/P4 maintenance(3) → Polish(3). `docs/feature-list.md`
updated to 🟢. Error Pages is the second feature with a complete
spec/plan/tasks trio.

**Home: spec + plan done** (2026-07-12, branch `003-home`,
`specs/003-home/`) — scoped to just the hero/search/trending/live-feed
area (nav/footer are Design System infrastructure, out of scope).
Simplified the wireframe's "online" dot to a decorative
posting-is-open indicator before planning, avoiding a real presence
system touching shared auth code for a cosmetic detail. Plan adds a
new minimal `postings` table (Home defines it, Post a Game extends it
later — same pattern as Auth & Onboarding/Error Pages), does all
search/filter/sort client-side over one server fetch per page load (no
new API route), and redirects logged-out visitors to `/login` until
Landing exists.

**Home: tasks done** (2026-07-12) — `tasks.md`, 24 tasks: Setup(1) →
Foundational(4) → US1/P1 search+filter+sort(7) → US2/P2 trending(5) →
US3/P3 empty-state(4) → Polish(3). `docs/feature-list.md` updated to
🟢. Home is the third feature with a complete spec/plan/tasks trio.

**Browse: spec + plan done** (2026-07-12, branch `004-browse`,
`specs/004-browse/`) — full faceted discovery, public (no auth,
unlike Home). Filters server-side via URL search params (not
client-side like Home) since Browse is the comprehensive surface, not
a small recent slice. Extends Home's `postings` table and relocates/
extends Home's listing-card component into a shared location rather
than duplicating it. Age group corrected to 18+/21+ (ADR 0002);
"Soonest" sort mapped to Posting's `scheduledDate` field.

**Browse: tasks done** (2026-07-12) — `tasks.md`, 22 tasks: Setup(1) →
Foundational(5) → US1/P1 search+filter+sort(7) → US2/P2 pills(3) →
US3/P3 empty-state(3) → Polish(3). `docs/feature-list.md` updated to
🟢. Browse is the fourth feature with a complete spec/plan/tasks trio.

**Post a Game: spec + plan done** (2026-07-12, branch `005-post-game`,
`specs/005-post-game/`) — the listing-creation form; extends the
shared `postings` table with its last fields (tags, recurring,
voiceLink), and is the first feature to actually consume Auth &
Onboarding's unverified-email write-action gate. Publishing is a
Server Action (not an API route); the live preview reuses the shared
listing-card component; game-suggestion quick-picks reuse the same
most-common-games aggregate as Home/Browse. "Save as draft" excluded
from scope (no draft state exists), logged to `docs/future-work.md`.

**Post a Game: tasks done** (2026-07-12) — `tasks.md`, 20 tasks:
Setup(1) → Foundational(5) → US1/P1 happy-path publish(6) → US2/P2
auth+verification gate(3) → US3/P3 validation guardrails(2) →
Polish(3). `docs/feature-list.md` updated to 🟢. Post a Game is the
fifth feature with a complete spec/plan/tasks trio.

**Listing detail: spec + plan done** (2026-07-12, branch
`006-listing-detail`, `specs/006-listing-detail/`) — introduces
`applications`/`questions` (first real writes to either), derives the
roster from host + accepted applications rather than a separate
`RosterSlot` table (ADR 0004 already removed the only field it would
have carried). Drops all wireframe roster role labels and host
mini-profile stats (rating/sessions/reliability/level — nothing
computes any of them yet). Accept/decline/remove-roster-member is
Inbox's job; Report/Save deferred to `docs/future-work.md`. Second and
third consumer of Auth & Onboarding's write gate.

**Listing detail: tasks done** (2026-07-12) — `tasks.md`, 27 tasks:
Setup(1) → Foundational(5) → US1/P1 apply+withdraw(8) → US2/P2 Q&A(7)
→ US3/P3 capacity correctness(3) → Polish(3). `docs/feature-list.md`
updated to 🟢. Listing detail is the sixth feature with a complete
spec/plan/tasks trio.

**Profile + Account settings: spec + plan done** (2026-07-12, branch
`007-profile-and-account-settings`) — four real routes under
`/profile` sharing a layout (Overview, My postings, Saved, Account),
not the wireframe's client-side tabs. Resolved a previously-open
question via the user: "Deactivate" and "Delete permanently" collapse
into one action (ADR 0005 makes true deletion impossible anyway).
Introduces `userGames` and `savedListings` — the latter retroactively
un-defers Listing detail's "Save" action (that feature's docs were
corrected accordingly). Omits rating/sessions/groups/level and
pronouns/languages/timezone (nothing computes or collects any of them
yet); omits Connected Accounts (Steam/Discord already deferred).
Second feature to touch `src/auth.ts` (deactivation/reactivation on
login), after Auth & Onboarding's Google `profile()` callback.

**Profile + Account settings: tasks done** (2026-07-12) — `tasks.md`,
35 tasks: Setup(1) → Foundational(4) → US1/P1 edit-profile(13) →
US2/P2 manage-postings(5) → US3/P3 saved(2) → US4/P4 privacy+
deactivate(7) → Polish(3). `docs/feature-list.md` updated to 🟢.
Profile is the seventh feature with a complete spec/plan/tasks trio —
the largest one specced so far.

**Blocked Users: spec + plan done** (2026-07-12, branch
`008-blocked-users`) — introduces `blocks` and `reports` (first writer
of the latter, via "Also report" — no review UI, that's Notifications
& Report's job). First real modal-dialog UI in this project. Defines
the Block relationship as a queryable entity; enforcement elsewhere
(Home/Browse/Listing detail/future Inbox/Forum) is explicitly out of
scope, flagged as a follow-up those docs may need.

**Blocked Users: tasks done** (2026-07-12) — `tasks.md`, 20 tasks:
Setup(1) → Foundational(5) → US1/P1 view+search+unblock(6) → US2/P2
block-new(5) → Polish(3). `docs/feature-list.md` updated to 🟢. Blocked
Users is the eighth feature with a complete spec/plan/tasks trio.

**Forum index: spec + plan done** (2026-07-12, branch
`009-forum-index`) — browse/search/filter/sort forum threads, public
to read. Server-side URL-driven filtering (Browse's pattern). HOT is
computed at read time, distinct from the real moderator-controlled
PINNED column. New Thread modal follows Blocked Users' dialog pattern.
Drops the wireframe's "online" stat and Discord widget.

**Forum index: tasks done** (2026-07-12) — `tasks.md`, 22 tasks:
Setup(1) → Foundational(5) → US1/P1 browse+search+filter+sort(8) →
US2/P2 create-thread(5) → Polish(3). `docs/feature-list.md` updated to
🟢. Forum index is the ninth feature with a complete spec/plan/tasks
trio.

**Forum Thread: spec + plan done** (2026-07-12, branch
`010-forum-thread`) — read a thread (public) + reply/like/report/
subscribe (gated). Likes are a real per-user relationship with a
database-level unique constraint. Second writer of Blocked Users'
`reports` entity. Drops the wireframe's fake best-answer badge, keeps
the real by-likes "Top" sort. Subscribe stores a preference only.

**Forum Thread: tasks done** (2026-07-12) — `tasks.md`, 28 tasks:
Setup(1) → Foundational(5) → US1/P1 read+sort(7) → US2/P2 reply+
quote(5) → US3/P3 like+report(7) → Polish(3). `docs/feature-list.md`
updated to 🟢. Forum Thread is the tenth feature with a complete
spec/plan/tasks trio.

**Inbox / messaging: spec + plan done** (2026-07-12, branch
`011-inbox-messaging`) — resolves Listing detail's deferred Application
accept/decline without amending that already-merged feature (a pending
Application's own message stands in as the request thread's opener
until acceptance). No websocket layer — a short `router.refresh()`
poll instead, real-time delivery logged as future work. Accepting a
request is one atomic transaction. First real consumer of Blocked
Users' block-enforcement contract.

**Inbox / messaging: tasks done** (2026-07-12) — `tasks.md`, 31 tasks:
Setup(1) → Foundational(5) → US1/P1 read+send(9) → US2/P2 start-
conversation(6) → US3/P3 accept+decline(7) → Polish(3).
`docs/feature-list.md` updated to 🟢. Inbox / messaging is the
eleventh feature with a complete spec/plan/tasks trio.

**Notifications + Report modal: spec + plan done** (2026-07-12, branch
`012-notifications-and-report-modal`) — bell dropdown + full page +
reusable 3-step Report modal. `createNotification()` ships with no
callers wired up yet (each existing feature's own follow-up). Accept/
Decline reuses Inbox's transaction directly. Report flow gives Blocked
Users' `reports` table its first real `reason` values. Retroactively
un-defers Listing detail's Report action (that feature's docs amended).

**Notifications + Report modal: tasks done** (2026-07-12) —
`tasks.md`, 25 tasks: Setup(1) → Foundational(5) → US1/P1 view+filter+
mark-read(9) → US2/P2 accept+decline reuse(2) → US3/P3 report-flow(5)
→ Polish(3). `docs/feature-list.md` updated to 🟢. Notifications +
Report modal is the twelfth feature with a complete spec/plan/tasks
trio.

**News feed: spec + plan done** (2026-07-12, branch `013-news-feed`) —
entirely read-only for `NewsPost` (minimal shape, Admin News extends
later). Server-side filtering/pagination (Browse/Forum's pattern).
Newsletter subscribe needs no login at all — the project's first
account-independent write action.

**News feed: tasks done** (2026-07-12) — `tasks.md`, 19 tasks: Setup(1)
→ Foundational(4) → US1/P1 browse+filter+search+paginate(6) → US2/P2
subscribe(5) → Polish(3). `docs/feature-list.md` updated to 🟢. News
feed is the thirteenth feature with a complete spec/plan/tasks trio.

**Content Page: spec + plan done** (2026-07-12, branch
`014-content-page`) — slug-based public page block-rendered from a
JSONB column. First real consumer of Error Pages' `require-role.ts`.
Batched local-state editing (matching the wireframe exactly). A draft
page is indistinguishable from a nonexistent slug for non-admins.
Scopes page creation out to the future Admin Content Pages feature.

**Content Page: tasks done** (2026-07-12) — `tasks.md`, 21 tasks:
Setup(1) → Foundational(4) → US1/P1 public-read(4) → US2/P2 inline-
edit(5) → US3/P3 publish+unpublish(4) → Polish(3).
`docs/feature-list.md` updated to 🟢. Content Page is the fourteenth
feature with a complete spec/plan/tasks trio.

**Admin Dashboard: spec + plan done** (2026-07-12, branch
`015-admin-dashboard`) — real KPIs/chart/needs-attention/top-games, all
read-only aggregates over existing tables, plus a new `auditEntries`
table for the recent-activity feed. "Active today" redefined as
timestamp-derived activity, not presence tracking. Sidebar shell
scoped out entirely (Design System infra). Second consumer of Error
Pages' `require-role.ts`.

**Admin Dashboard: tasks done** (2026-07-12) — `tasks.md`, 24 tasks:
Setup(1) → Foundational(3) → US1/P1 KPIs+chart+top-games(10) → US2/P2
needs-attention+activity(7) → Polish(3). `docs/feature-list.md`
updated to 🟢. Admin Dashboard is the fifteenth feature with a
complete spec/plan/tasks trio.

**Admin Users: spec + plan done** (2026-07-12, branch `016-admin-users`)
— user list/stats/ban-unban/content-removal drawer. Drops "Delete"
(collapsed into Ban, reusing Profile's own resolution). "Flagged" is
computed from existing reports, never stored. Adds `removedAt` to
`postings`/`forumThreads` with bounded amendments to Home/Browse/Forum
index's read queries so removal has a real effect.

**Admin Users: tasks done** (2026-07-12) — `tasks.md`, 27 tasks:
Setup(1) → Foundational(4) → US1/P1 view+search+filter(6) → US2/P2
ban+unban(4) → US3/P3 drawer+content-removal(9) → Polish(3).
`docs/feature-list.md` updated to 🟢. Admin Users is the sixteenth
feature with a complete spec/plan/tasks trio.

**Admin Postings: spec + plan done** (2026-07-12, branch
`017-admin-postings`) — moderation queue with computed severity
(never stored — worse of report-reason severity and a new
auto-flag-reason's own fixed severity), a real fixed deterministic
auto-flag ruleset (bounded amendment to Post a Game's
`create-posting.ts`), a new minimal `warnings` table (first feature
to need one), and this feature's own reports.status open→resolved
transition (its first ever). Also the first real `logAuditEntry()`
caller, with two retroactive bounded fixes: Admin Users' ban/
remove-content actions gain the audit-log call `015` always
anticipated for them, and Admin Dashboard's live-postings/top-games
KPIs gain the `removedAt` exclusion they were missing since before
`016` existed.

**Admin Postings: tasks done** (2026-07-12) — `tasks.md`, 31 tasks:
Setup(1) → Foundational(4) → US1/P1 view+filter queue(6) → US2/P2
drawer+approve+remove(7) → US3/P3 warn+ban(6) → cross-feature
amendments(4) → Polish(3). `docs/feature-list.md` updated to 🟢.
Admin Postings is the seventeenth feature with a complete
spec/plan/tasks trio.

**Admin Forum: spec + plan done** (2026-07-12, branch
`018-admin-forum`) — second moderation-queue feature, spanning
threads and replies. Extracts two shared moderation helpers
(`reason-severity.ts`, `auto-flag-rules.ts`) out of Admin Postings'
(`017`) inline copies, correcting a wireframe-vs-ratified-taxonomy
mismatch in the severity mapping along the way. Generalizes `017`'s
`warnings` table to a polymorphic `targetType`/`targetId` shape (the
exact generalization `017`'s own research anticipated). Adds a new
`forumReplies.removedAt`/lock-enforcement on threads. "Actioned
today" is the first live product-facing read of `015`'s
`auditEntries` table.

**Admin Forum: tasks done** (2026-07-12) — `tasks.md`, 41 tasks:
Setup(1) → Foundational(6) → US1/P1 view+filter queue(8) → US2/P2
drawer+approve+remove(7) → US3/P3 lock+warn+ban(8) → cross-feature
amendments to 009/010(4) → retroactive amendments to 017(4) →
Polish(3). `docs/feature-list.md` updated to 🟢. Admin Forum is the
eighteenth feature with a complete spec/plan/tasks trio.

**Admin Reports: spec + plan done** (2026-07-12, branch
`019-admin-reports`) — the unified triage queue across postings,
forum, profiles, and messages. Groups by reported target (not one row
per report); a generic Dismiss action; Remove/Warn DELEGATE to `017`'s/
`018`'s existing resolution actions for postings/forum (reused, not
reimplemented) while being the first real mover for profiles and
messages (new `messages.removedAt`, further-generalized `warnings`).
"Total reports" is a computed cross-source aggregate. Retroactively
adds `reports.resolvedAt` to `017`/`018` and corrects the shared
`reason-severity.ts`'s `impersonation` mapping (medium → high) — a
one-place fix that flows to all three moderation features at once.

**Admin Reports: tasks done** (2026-07-12) — `tasks.md`, 37 tasks:
Setup(1) → Foundational(6) → US1/P1 view+filter grouped queue(6) →
US2/P2 dismiss+remove(9) → US3/P3 warn+ban(6) → cross-feature
amendment to 011(2) → retroactive amendments to 017/018(4) →
Polish(3). `docs/feature-list.md` updated to 🟢. Admin Reports is the
nineteenth feature with a complete spec/plan/tasks trio.

**Admin News: spec + plan done** (2026-07-12, branch `020-admin-news`)
— the News CMS editor, News feed's (`013`) first real `NewsPost`
writer. Adds `body`/`status`; reuses `013`'s existing `featured` for
"pin" rather than a redundant column. "Delete" collapses into
"Unpublish" (status→draft), same ADR-0005 resolution already used for
Profile/Admin Users. Scheduled-post publication is computed at read
time (a bounded amendment to `013`'s `search-news.ts`), no cron job.
The wireframe's "editor" role label normalized to the existing
moderator-minimum gate — not a real distinct role.

**Admin News: tasks done** (2026-07-12) — `tasks.md`, 26 tasks:
Setup(1) → Foundational(4) → US1/P1 view+filter list(6) → US2/P2
editor+publish+schedule+draft(5) → US3/P3 pin+delete(5) →
cross-feature amendment to 013(2) → Polish(3). `docs/feature-list.md`
updated to 🟢. Admin News is the twentieth feature with a complete
spec/plan/tasks trio.

**Admin Content Pages: spec + plan done** (2026-07-12, branch
`021-admin-content-pages`) — a thin management list wrapping Content
Page's (`014`) already-existing table and `toggle-page-status.ts`
(reused directly for Publish/Unpublish, not reimplemented). Adds a new
`system` boolean column and seeds the three system pages (About Us/
Privacy Policy/Terms of Use) as real rows, since no feature had ever
written one before. "Delete" collapses into the same status='draft'
resolution already used for Admin News, restricted to non-system
pages only. "Edit" navigates to `014`'s own inline-edit surface rather
than building a second editor.

**Admin Content Pages: tasks done** (2026-07-12) — `tasks.md`, 25
tasks: Setup(1) → Foundational(5, incl. the system-page seed) →
US1/P1 view+search+filter(6) → US2/P2 publish+unpublish+create(6) →
US3/P3 delete(4) → Polish(3). `docs/feature-list.md` updated to 🟢.
Admin Content Pages is the twenty-first feature with a complete
spec/plan/tasks trio.

**Public Profile: spec + plan done** (2026-07-12, branch
`022-public-profile`) — the public `/u/:handle` page. Drops six
wireframe elements against already-established decisions (online
presence, reliability %, groups, per-game rank/hours, level,
pronouns/languages/timezone — the last three explicitly NOT part of
this feature's 2026-07-12 scope confirmation, which only covered
Follow/Invite/mutual-connections). New `follows` table (hard-delete
on unfollow, same exception as SavedListing/Likes). Host-initiated
"Invite to a party" reuses `006`'s `applications` via a new
`initiatedBy` field rather than a parallel system, with bounded
amendments to `011` so the invited user (not the host) makes the
accept/decline call, reusing the exact same transactional logic
either way. "Player reviews" ships as a new, display-only `reviews`
table with no writer yet — same pattern as Notification/AuditEntry.

**Public Profile: tasks done** (2026-07-12) — `tasks.md`, 28 tasks:
Setup(1) → Foundational(4) → US1/P1 view profile(5) → US2/P2
follow+message+invite(10) → US3/P3 in-common+report+block(5) →
Polish(3). `docs/feature-list.md` updated to 🟢. Public Profile is
the twenty-second feature with a complete spec/plan/tasks trio.

**News Article detail: spec + plan done** (2026-07-12, branch
`023-news-article-detail`) — the public `/news/:slug` article page.
Adds `newsPosts.slug` (neither `013` nor `020` ever needed one) with
bounded amendments to `020`'s save action (slug generation) and
`013`'s card linking. Read time is computed from the body's word
count, not `013`'s never-populated `readTimeMinutes` column. Like
reuses `010`'s polymorphic `likes` table as its third consumer; Save
gets its own new `savedNewsPosts` table rather than prematurely
generalizing `SavedListing` (only the second consumer — this
project's "generalize at three" bar, from `warnings`, isn't met yet),
with a bounded amendment surfacing it in Profile's (`007`) Saved tab.

**News Article detail: tasks done** (2026-07-12) — `tasks.md`, 28
tasks: Setup(1) → Foundational(5) → US1/P1 read article(5) → US2/P2
like+save(7) → US3/P3 keep-reading+share(4) → cross-feature
amendments to 013/020(3) → Polish(3). `docs/feature-list.md` updated
to 🟢. News Article detail is the twenty-third feature with a
complete spec/plan/tasks trio.

**Admin Settings: spec + plan done** (2026-07-12, branch
`024-admin-settings`) — the most reconciliation-heavy feature yet.
Extends `002`'s singleton `settings` table exactly as that feature's
own spec anticipated (finally shipping a real maintenance-mode
toggle). Makes `017`'s/`018`'s hardcoded auto-flag ruleset real,
admin-editable config. Adds a computed (never stored) auto-hide-
after-N-reports rule and a display-only "needs ban review" severity
badge — never an automated ban. Expands roles to a 4-tier model
(`support`/`viewer` ship as assignable but functionally identical to
a plain user today — no differentiated permissions built yet).
Dropped three wireframe controls outright (a 13+/16+ signup-age
option directly contradicting ADR 0002; an "optional" email-
verification toggle that's already hardcoded; a per-device blocklist-
sync toggle with no per-device concept anywhere in this project).
Found and fixed a real gap while researching this feature: Public
Profile (`022`) never actually honored the privacy toggles Profile
(`007`) already stored.

**Admin Settings: tasks done** (2026-07-12) — `tasks.md`, 43 tasks:
Setup(1) → Foundational(6) → US1/P1 general+maintenance(7) → US2/P2
moderation+auto-flag(11) → US3/P3 roles+features+safety(15) →
Polish(3). `docs/feature-list.md` updated to 🟢. Admin Settings is the
twenty-fourth feature with a complete spec/plan/tasks trio.

**Moderator audit log: spec + plan done** (2026-07-12, branch
`025-moderator-audit-log`) — a read-only, day-grouped, searchable/
filterable viewer over Admin Dashboard's (`015`) existing
`auditEntries` table, gated at moderator (not admin — a transparency
tool, not a mutation surface). Simplifies the wireframe's 11-way
category-badge scheme down to the real, stored 4-value category
rather than fabricating a finer classifier. Found and fixed a third
real gap this session: Admin News and Admin Content Pages never
wired `logAuditEntry()` despite `015`'s own spec anticipating them —
both now do.

**Moderator audit log: tasks done** (2026-07-12) — `tasks.md`, 21
tasks: Setup(1) → Foundational(2) → US1/P1 browse+search+filter(6) →
US2/P2 expand+export(4) → US3/P3 close the 020/021 gap(5) →
Polish(3). `docs/feature-list.md` updated to 🟢. Moderator audit log
is the twenty-fifth feature with a complete spec/plan/tasks trio.

**Landing page: spec + plan done** (2026-07-12, branch
`026-landing-page`) — the final feature of the project-wide gate.
Closes the loop Home's (`003`) own spec explicitly left open: its
root route stops redirecting an unauthenticated visitor to `/login`
and renders this feature's marketing content instead, with Home's
authenticated experience completely unchanged. Every "live-feeling"
number is reconciled to real, computed data — a real "open parties
right now" stat replaces the fake "online now" one, a real floating
example listing card replaces the wireframe's fabricated one (with an
honest fallback when none exist), and the average-rating stat is
dropped outright (no real rating data exists). Testimonials are kept
as fixed marketing copy — the one deliberate, explained exception to
this project's no-fake-data discipline. Adds one small field,
`applications.acceptedAt`, to power "parties formed this week."

**Landing page: tasks done** (2026-07-12) — `tasks.md`, 19 tasks:
Setup(1) → Foundational(3) → US1/P1 real marketing page(7) → US2/P2
CTA navigation(2) → US3/P3 real hero-card data(3) → Polish(3).
`docs/feature-list.md` updated to 🟢. Landing page is the
twenty-sixth and FINAL feature with a complete spec/plan/tasks trio.

## 🎉 Project-wide constitutional gate closed

All 26 features tracked in `docs/feature-list.md` now have a complete
`spec.md`/`plan.md`/`tasks.md` trio, each merged to `main`. Per the
constitution (v1.0.0), implementation may now begin on any/all of
them — the marathon that started with Auth & Onboarding is complete.

**Brand Identity delivered** (2026-07-13): `resources/design/Brand
Identity - playm8z.dc.html` dropped in alongside the already-present
Dark/Light Theme sheets. It's an exploration trail (Turns 1-4: three
initial directions, a WCAG contrast pass, a three-way merge, then
"Turn 4 — LOCKED") culminating in **Warm Pop** as the locked identity,
rendered as full dark (4a) and light (4b) mockups. Reconciled against
`guidelines.md` §4's existing distillation: **zero discrepancies** —
every token, gradient, type-scale value, component pattern, and
accessibility rule in §4 matches the locked file exactly (wordmark
gradient, two-pawn mark, "Assemble your party" tagline, Sora + Space
Mono, the full color-token table, button/card/tag/listing-card specs).
No `guidelines.md` edit needed. The one file still not delivered is
the interactive theme-switching **`playm8z - Design System.dc.html`**
itself — but it would only be a combined presentation of the same
tokens already confirmed live in the Dark Theme/Light Theme sheets, so
its absence is no longer a blocker for implementation.

## Implementation begins: Auth & Onboarding (2026-07-13)

**Auth & Onboarding: implemented** — all 40 tasks in
`specs/001-auth-onboarding/tasks.md` complete, on branch
`001-auth-onboarding` (rebuilt on top of `main` post-gate-closure),
merged back to `main`.

**Design system wired in first**: this is the first feature to render
any real UI, so `src/app/globals.css`/`layout.tsx` now carry the actual
Warm Pop tokens and Sora/Space Mono fonts (`guidelines.md` §4) instead
of the create-next-app defaults — infrastructure, not this feature's
own scope, but a prerequisite every screen from here on reuses. Two
small reusable brand components (`PawMark`, `Wordmark`) back it.

**Schema**: `users` gains `handle` (unique, nullable at the DB level —
a deliberate, reasoned deviation from data-model.md's literal "not
null": a fresh Google sign-up's row is created by Auth.js's adapter
before onboarding ever runs, so there's a real window with no handle
yet), `avatarColor`, `region`, `platforms`, `ageGroup`, `vibe`,
`playTimeSlots`, `gamesPlayed`.

**The post-auth routing question** (T030) took real design work beyond
what tasks.md specified at the code level: with no separate onboarding
status field (data-model.md, deliberate), the routing signal is simply
"does this account have a handle yet." Credentials accounts always do
(set at registration, before onboarding runs), so returning Credentials
users always land on Home regardless of how much of onboarding they
finished or skipped — satisfying the spec's "never auto-resume/
re-prompt." Google accounts don't get one until onboarding Step 1 sets
it (research.md #2), so that's the one real ambiguous case this check
resolves. Concretely: signup always routes straight to `/onboarding`
(hardcoded — a fresh account's handle would otherwise wrongly satisfy
the shared check and skip onboarding entirely); login and Google both
route through a shared `/(auth)/continue` checkpoint that applies the
handle-presence check. One caught-during-implementation edge case
worth flagging: a Google user who clicks "Skip for now" at Step 1
*without* ever entering a handle will see onboarding again on their
next login (since they still have none) — a reasoned, accepted
tradeoff given handle is a hard FR-003 requirement with no other
collection point in this feature's scope, not a bug.

**Security note caught during implementation**: `POST /api/onboarding`
echoes the updated profile per contracts/api.md, but must never include
`passwordHash` in that response — the route explicitly selects/returns
a safe column allowlist rather than `.returning()`'s default full row.

**Real Postgres integration tests** (Principle V) for
`/api/auth/register` and `/api/onboarding`, running against local dev
Postgres (matching CI's ephemeral container) — 45 unit/integration
tests total, all passing. Three Playwright e2e specs cover quickstart.md
Scenarios 1-3 exactly (signup+onboarding, skip-onboarding, login),
including two axe-core accessibility scans (caught and fixed two real
WCAG violations: auth pages needed a `<main>`/`<header>` landmark
structure, and the onboarding wizard's step headings needed to be
`<h1>` — there's exactly one visible at a time, so promoting all of
them was correct, not a hierarchy violation). `e2e/smoke.spec.ts`
retired, fully superseded. Quickstart Scenario 4 (Google sign-up gets a
handle) is verified by code review, not a live run — scripting a real
Google OAuth consent flow isn't practical here. Scenario 5 (unverified
user blocked from a write action) is verified via
`require-verified-email.test.ts` only, since no write-action feature
(Post a Game, etc.) exists yet to gate for real — tasks.md itself
anticipated this, shipping the gate helper ready-to-call with no
consumer yet.

`npm run typecheck`, `npm run lint`, `npm test` (45 passing),
`npm run test:e2e` (4 passing), and `npm run build` all verified green
before merging.

## Error Pages implemented (2026-07-13)

**Error Pages: implemented** — all 23 tasks in
`specs/002-error-pages/tasks.md` complete, on branch `002-error-pages`
(rebuilt on top of `main`), merged back.

Built on Next.js 16's native mechanisms rather than a hand-rolled
scheme: `app/not-found.tsx` (404), `app/error.tsx` +
`app/global-error.tsx` (500, using the auto-generated `error.digest` as
the reference code and the new `unstable_retry()` prop for "Try
again"), and `app/forbidden.tsx` + `app/unauthorized.tsx` (403/401,
behind `experimental.authInterrupts`). All four share one
`error-state.tsx` component (logo, disconnected-pawns motif, code,
title, message, two actions, footnote).

**New `settings` table** (read-only for this feature; Admin Settings
owns writing to it later) backs the maintenance flag —
`maintenanceMode`/`maintenanceMessage`, seeded to `false`/`null` by the
migration. `get-settings.ts` reads it through a 5-second in-memory
cache. Toggle it manually for now via `npm run db:studio` or direct
SQL.

**`require-role.ts`** is built and unit-tested but honestly can't do
much yet: there's no `role` column on `users` (that's Admin Settings,
feature #24, still unimplemented — the user explicitly chose to wait
for it rather than have this feature or a one-off request add it
early). Every authenticated user is treated as rank `user`, so calling
`requireRole()` with anything above `user` forbids everyone right now
— accurate, not a bug, since nothing elevated exists yet. Verified live
(not just unit-tested) via a temporary synthetic route calling it,
confirming real 401 (logged out) and 403 (logged in, insufficient
rank) responses — removed before merging, per this feature's own
tasks.md note that no permanent gated page exists yet to justify
keeping one.

**`proxy.ts`** short-circuits every non-`/admin/*` route to
`/maintenance` (503) when the flag is on; `/admin/*` is never
intercepted regardless of session, so each admin page's own future
`require-role.ts` gate remains the real authority there.

**Two real bugs caught by actually running `next build`** (not just
trusting dev mode, per this feature's own tasks.md T021 note that a new
experimental flag + a proxy touching every route deserves a direct
check): `/maintenance` was getting statically prerendered, freezing
whatever `maintenanceMessage` existed at build time forever regardless
of later DB changes; a test-only route that deliberately throws (for
exercising `error.tsx` in e2e) failed the production build outright,
since static prerendering executes the page at build time. Both fixed
with `export const dynamic = "force-dynamic"`.

**A real e2e test-isolation bug**: `maintenance.spec.ts` mutates the
shared, global `settings` row for real (not a mock), which — combined
with Playwright's default `fullyParallel: true` — let that global
state bleed into unrelated concurrently-running tests hitting `/`,
`/login`, `/onboarding` mid-run, breaking them. Fixed by setting
`workers: 1` in `playwright.config.ts` (correctness over parallel speed
at this suite's current size, not a per-test workaround, since any
future global-state test would hit the same bug).

58 unit/integration tests and 7 e2e tests (including 3 axe-core scans)
all passing. `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:e2e`, and `npm run build` all verified green before
merging.

## Next up

- Auth & Onboarding, Error Pages, Home, Browse, Post a Game, Listing
  detail, Profile + Account settings, Blocked Users, Forum index, and
  Forum Thread are implemented and merged. Inbox/messaging (`011`) is
  next — awaiting the user's go-ahead.
- Listing detail's Report action (FR-019) is deferred pending
  Notifications + Report modal (`012`, not yet implemented) —
  `specs/006-listing-detail/tasks.md`'s T030. Revisit as a bounded
  amendment to Listing detail once `012` is built.
- Real Resend wiring remains blocked on domain ownership (unchanged);
  verification emails still log to the server console.
- `users.role` and real admin gating remain blocked on Admin Settings
  (feature #24) being implemented — `require-role.ts` is ready and
  waiting.

## Home implemented (2026-07-13)

**Home: implemented** — all 24 tasks in `specs/003-home/tasks.md`
complete, on branch `003-home` (rebuilt on top of `main`), merged back.

`/` (`src/app/page.tsx`) now redirects an unauthenticated visitor to
`/login` (research.md #3 — becomes Landing once that feature ships)
and otherwise renders the real page: hero heading/tagline, then a
client-side search bar + Vibe/Region quick-filter chips + sort control
+ live feed, all filtering one already-fetched list of open postings
(no new API route — mirrors the wireframe's own reference
implementation). A recalculated-per-load Trending row (`GROUP BY game`
over open postings, top 5) narrows the feed to a game on selection,
in place. A zero-match state shows guidance and a "Post this game"
link carrying the search term to `/post?game=...` (Post a Game's
future route).

**New minimal `postings` table** (`hostId`, `game`, `title`, `blurb`,
`vibe`, `region`, `seatsTotal`, `seatsOpen`, `status`, `createdAt`) —
Home defines the shape its own FRs need; Post a Game will extend it
with its remaining columns later, same pattern as Auth & Onboarding
extending `user` and Error Pages adding `settings`. `getOpenPostings()`
joins `users` for the host's *real* name/avatar rather than inventing
per-listing display data. A new `npm run db:seed-postings` script
seeds sample rows against the first real registered user, since Post a
Game doesn't exist yet to create them through the UI — dev-only,
idempotent (clears existing postings first).

**Real WCAG AA bug caught by axe-core**: the "Serious" vibe tag (bold,
11px, magenta text on a magenta-tinted pill background) measured
4.32:1 against the required 4.5:1 — bold text only gets WCAG's relaxed
3:1 "large text" threshold at ≥14pt (≈18.66px) bold, which 11px doesn't
meet despite being bold. `guidelines.md` §4.4's own shorthand
("Magenta only at ≥16px or bold") turns out to be imprecise at small
sizes on a *tinted* (not solid) background — every other `text-pop`
usage elsewhere in the app is on a solid background and already passes
at 5.5:1 (confirmed by its own earlier axe scans), so this was
genuinely new territory, not a regression. Fixed with a new
`--color-pop-text` token (`#ff7ea0` on dark, same as `--color-pop` on
light) for small/bold text on a pop-tinted background specifically.

**A real ESM/env-loading bug in `scripts/seed-postings.ts`**: static
imports are hoisted ahead of any top-level code regardless of source
order, so importing `src/db` before calling `process.loadEnvFile()`
meant `DATABASE_URL` was never actually loaded before the DB client
tried to read it. Fixed with a dynamic `await import()` inside `main()`,
after the env load.

78 unit/integration tests and 10 e2e tests (4 with axe-core scans, one
of which caught the contrast bug above) all passing.
`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`,
and `npm run build` all verified green before merging.

**ADR 0006** (`docs/adr/0006-handle-only-public-identity.md`, 2026-07-13):
the user flagged, while reviewing Home, that listing cards showed a
host's real/display name (auto-populated from Google for OAuth
accounts) rather than their handle — a privacy concern that applies
platform-wide, not just to this one card. Decision: **`user.handle` is
the only identity ever shown to *other* users, anywhere** — display
name is retained but narrowed to self-facing UI only (e.g. onboarding's
"You're all set, Mara!"), confirmed with the user rather than assumed.
Home (`003`, already merged) amended: `get-open-postings.ts`'s
`hostName` field and `listing-card.tsx`'s host display now show
`@handle`. Auth & Onboarding (`001`) needed no code change — it already
only shows `name` on its own self-facing completion screen. Every
not-yet-implemented feature that shows another user's identity (Public
Profile, Forum, Listing detail, Inbox, admin views of user content)
reconciles against this ADR when it's actually implemented, per this
project's established pattern, rather than rewriting all 23 remaining
specs preemptively.

## Browse implemented (2026-07-13)

**Browse: implemented** — all 22 tasks in `specs/004-browse/tasks.md`
complete, on branch `004-browse` (rebuilt on top of `main`), merged
back.

Unlike Home's client-side filter over one fetched list, `/browse` is
the full/comprehensive discovery surface: every facet (keyword, Vibe,
Game, Genre, Region, Time slots, Age group, Open slots, Platform, Mic
required) lives in the URL's `searchParams` and drives a real
server-side Drizzle query per request, built by one shared
`buildFilterConditions()` helper in `search-postings.ts` — AND across
facets, OR within a multi-select facet. Live Game/Region facet counts
(`get-facet-counts.ts`) reflect every *other* active facet and never
disappear even at count `0` (a separate unfiltered-option-list query
merged with a filtered-excluding-self count). Removable filter pills
plus "Clear all," three sorts (Recent/Open seats/Soonest — the last
ordering by `scheduledDate` with nulls sorted last via a raw SQL
`is null` predicate), and an empty state linking to Post a Game's
future `/post` route with the search term carried over.

**Schema**: extends `postings` (Home's table) with `genre`,
`ageGroup`, `timeSlots` (array), `platform`, `micRequired`,
`scheduledDate` — same shared-table-extension pattern as Auth &
Onboarding/`user` and Error Pages/`settings`. Relocated Home's
`listing-card.tsx` to a shared `src/components/listings/` location
(extended with a genre eyebrow and time-slot tag) rather than
duplicating it for Browse's fuller data shape.

**A real Postgres bug, not just a test artifact**: `get-facet-counts.ts`'s
two queries (`getGameFacetCounts`/`getRegionFacetCounts`) reused the
shared `buildFilterConditions()` helper — which can emit a condition
referencing `users.handle` for keyword search — without ever joining
`users` in their own queries. This meant any real visitor typing a
search term on `/browse` would hit a live Postgres error ("missing
FROM-clause entry for table \"user\""), completely undetected by the
original test suite since it never exercised a keyword-search-plus-
facet-count combination together. Found by digging into a Playwright
test that timed out with zero matches rather than assuming the code
was correct — traced via `curl` to the raw escaped error in the page's
RSC payload. Fixed by adding `.innerJoin(users, ...)` to both queries,
then back-filled two regression unit tests specifically covering
"doesn't throw when a keyword search is active."

**A flaky axe-core finding, root-caused rather than silenced**: the
first e2e test's a11y scan intermittently flagged an `<h1>`→`<h3>` jump
(the sidebar's `<h2>` "Filters" missing), passing most runs but failing
roughly 1 in 3-4 — including one run where it had already passed once
before, ruling out a simple "forgot to apply the fix" explanation.
Root cause: `browse/page.tsx` wrapped every client component
(`SearchHeader`/`FilterSidebar`/`SortControl`/`ActivePills`/
`BrowseEmptyState`) in a fallback-less `<Suspense>`. Per Next.js's own
docs, that pattern exists specifically to avoid a build-time CSR
bailout for a *static* page calling `useSearchParams()` — this page is
already fully dynamic (it awaits the `searchParams` prop server-side),
so the boundaries served no purpose and left a transient window during
hydration where wrapped content could render without its heading.
Removed all five `<Suspense>` wrappers; reran the isolated a11y test
4/4 clean and the full 7-test suite twice in a row with zero failures,
and confirmed `next build` still emits `/browse` as dynamic (ƒ), so no
CSR-bailout build error was traded in.

**A reusable Playwright lesson**: Tailwind v4's `.sr-only` utility uses
`clip-path: inset(50%)`, which makes a visually-hidden native
checkbox/radio fail Playwright's actionability check on `.check()`/
`.click()` even though a real user can still toggle it via the
wrapping `<label>`'s native click-forwarding. `e2e/browse.spec.ts`
adds a `selectFacet()` helper that clicks the visible label instead —
state *assertions* (`.toBeChecked()`) still work fine directly on the
input's role, since those only read DOM state rather than requiring
visibility.

11 new/extended unit test files and a 7-scenario `e2e/browse.spec.ts`
(one with an axe-core scan) — 106 unit tests and 17 e2e tests total
across the whole suite (every spec file, not just Browse's), all
passing. `npm run typecheck`, `npm run lint`, `npm test`, `npm run
test:e2e`, and `npm run build` all verified green before merging.

## Post a Game implemented (2026-07-13)

**Post a Game: implemented** — all 20 tasks in
`specs/005-post-game/tasks.md` complete, on branch `005-post-game`
(rebuilt on top of `main`), merged back.

The listing-creation form at `/post`: an unauthenticated visitor
redirects to `/login` (FR-016); an authenticated visitor sees the full
form regardless of email-verification status, since only *publishing*
is gated, not viewing/filling it out. Publishing is a Server Action
(`create-posting.ts`) — the first real consumer of Auth & Onboarding's
`requireVerifiedEmail()` write gate, built ready-to-call in that
feature and unconsumed until now (FR-017). Every field is re-validated
server-side via a new `posting.ts` Zod schema, including a cross-field
`refine` re-deriving that Spots open stays within `1..(Group size − 1)`
independent of whatever the client's own stepper clamping already
enforced (research.md #5) — a hand-crafted request bypassing the UI is
still rejected. The live preview reuses the exact same
`listing-card.tsx` component Home and Browse already render (research.md
#3), fed the form's current in-progress values plus the user's real
handle/avatar color; since that component is a real `Link` to
`/listing/:id` everywhere else it's used, the preview neutralizes
clicks with a capture-phase `preventDefault()` so an unsaved draft
doesn't attempt to navigate anywhere. Game-name quick-pick suggestions
(`get-game-suggestions.ts`) reuse the same most-common-open-game
aggregate Home's Trending row and Browse's Game facet already compute,
per ADR 0001's rejection of a curated game list.

**Schema**: extends `postings` (Home's table, already extended by
Browse) with `tags`, `recurring`, `voiceLink` — the last fields this
entity collects.

**A real schema correction, caught while writing this feature's own
data model**: Browse's original `genre` column was `NOT NULL`, but
neither the source wireframe nor this feature's own data-model.md ever
required a genre chip selection to publish — FR-014 gates Publish on
game+title only, matching the wireframe's own initial empty-genre
state. Loosened `genre` to nullable via a small migration rather than
inventing an artificial default value: `listing-card.tsx` already
rendered game-only when genre was absent (already a structural
optional field, from Home's minimal query never selecting it), and
Browse's genre filter already excludes non-matching rows gracefully
(a genre-less posting just never matches an active genre chip) — no
other query needed to change to accommodate this.

**The same heading-order a11y issue class Browse had just fixed,
caught proactively this time**: `/post`'s page has an `<h1>` with
nothing but the reused `listing-card.tsx`'s `<h3>` below it — the
exact `<h1>`→`<h3>` jump that bit Browse. Fixed before it ever showed
up as a test failure by promoting the form's four section labels ("01
· What are you playing?" through "04 · Party & comms") and the "Live
preview" label to real `<h2>`s — the semantically correct structure on
its own merits, not just an axe workaround.

**A cold-start false alarm, not a real defect**: the very first
Playwright run against this brand-new route/Server Action timed out
(30s) waiting for the post-publish redirect to `/browse`, with no
navigation event observed at all. Rather than assume a product bug or
patch around the symptom, it was root-caused: two isolated debug
reproductions against the now-warm route completed the identical
click-to-redirect flow in under 3 seconds each, and two full reruns of
the real suite passed cleanly and quickly. Next.js dev mode compiles a
route (and, separately, a Server Action) on its first-ever request —
this was that one-time cost landing inside a single test's timeout
window, not flakiness in the test or the feature.

15 new unit tests (`posting.ts`'s Zod schema, including the stepper
cross-field refinement) plus 7 new integration tests
(`create-posting.ts`'s insert/gate/validation behavior, against real
Postgres) and a 4-scenario `e2e/post-game.spec.ts` (one with an
axe-core scan) — 127 unit tests and 21 e2e tests total across the
whole suite (every spec file), all passing, confirmed twice in a row.
`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`,
and `npm run build` all verified green before merging.

## Listing detail implemented (2026-07-13)

**Listing detail: implemented** — 26 of 27 tasks in
`specs/006-listing-detail/tasks.md` complete, on branch
`006-listing-detail` (rebuilt on top of `main`), merged back.

The public `/listing/[id]` page: header (recruiting/full state, per
`postings.seatsOpen`), About (the real `blurb` text — the wireframe's
"What I'm looking for" checklist is omitted entirely, not fabricated,
since no field backs discrete checklist items and Post a Game's own
form never collected one), a Details grid, a derived Party roster
(host + accepted applicants + dashed open rows, no role/class label
anywhere per ADR 0004 — `get-roster.ts` computes `openCount =
seatsTotal - 1 - acceptedCount`), a public Q&A thread (any verified
visitor asks; only the host replies, enforced by a per-resource
ownership check — a new authorization shape beyond the session-wide
auth/verification checks every prior write action used), and a sticky
apply panel (message + Apply, or confirmation/withdraw once applied)
plus Share and Save. A logged-out visitor sees "Log in to apply"/"Log
in to ask a question" proactively rather than a dead-end form.

**Schema**: introduces `applications` (this feature's first real
writer — a fourth `withdrawn` status distinct from `declined` so the
record stays legible about who ended it, per ADR 0005) and `questions`
(one reply per question, host-only, enforced server-side). Also
introduces `savedListings` — Profile (`007`) owns this entity's shape
for its own "Saved" tab, but since features are being implemented in
numeric order, Listing detail gets there first and creates the table
(same shared-table precedent as `postings`). Unsaving is a real
delete, a deliberate, documented, scoped exception to ADR 0005 — a
bookmark carries no moderation/audit history worth preserving.

**Report (FR-019) is the one deferred task, not stubbed.** It opens
Notifications + Report modal's (`012`) canonical report flow, and that
feature hasn't been implemented yet — there's no modal component to
wire into. Share and Save shipped since neither depends on an
unimplemented feature. `tasks.md`'s T030 documents the deferral
explicitly; revisit as a bounded amendment once `012` lands, matching
this project's established cross-feature-amendment pattern.

**A real, reproducible bug, caught by inspecting the actual
accessibility snapshot rather than assuming a timing fluke**: after a
successful Apply, `apply-panel.tsx`'s local `submitting` flag was never
reset to `false` before `router.refresh()` re-rendered the panel into
its new "pending" branch — so the Withdraw button rendered
already-disabled, showing "Withdrawing…" before anyone had clicked it.
A debug spec that dumped the page's accessibility tree at the moment
of failure showed `btn.count()` was `0` for the expected "Withdraw
application" text, since the button had already relabeled itself. The
identical latent bug existed in the Q&A reply handler too, just masked
there since the reply form unmounts entirely on success. Fixed by
resetting `submitting` immediately once the action resolves, on both
the success and failure paths, in both `apply-panel.tsx` and
`qa-thread.tsx`.

**A confirmed dev-mode-only Playwright false alarm, not a product
bug — root-caused with the same discipline as Post a Game's cold-start
false alarm, not waved away as "probably flaky."** The Q&A e2e test's
final check (a reply visible to a logged-out visitor) failed
consistently, but only when simulated via
`page.context().clearCookies()` on the *same* browser context. Traced
via `curl` to `next dev` sending `Cache-Control: no-cache,
must-revalidate` for this route — missing the `no-store` directive a
real production build sends (`private, no-cache, no-store, max-age=0,
must-revalidate`), confirmed by actually running `next build && next
start` side-by-side and diffing the headers. Combined with no `Vary:
Cookie`, Chromium's own HTTP cache could reuse a pre-mutation response
across a cookie change within one browser context — a dev-server-only
artifact. A genuinely fresh `browser.newContext()` (real isolation,
not just cleared cookies) showed correct data on the first request,
every time, confirmed repeatedly. Fixed the *test* (use a fresh
context for the "different visitor" check), not the product — this
cannot happen for a real visitor in production, where `no-store`
prevents the browser from caching the response at all.

**Also fixed a real, pre-existing test-isolation gap**, exposed
(not caused) by re-running the dev-seed script during this session:
`search-postings.test.ts`'s keyword-search test searched for the
literal string "Casual dives," which collided with
`seed-postings.ts`'s sample title "Casual Dives — all welcome" via a
case-insensitive substring match. Scoped that title with the same
`tag()` helper the file already uses for all its other rows.

31 new unit/integration tests (`listing-detail.ts`'s Zod schemas,
`get-roster.ts`'s derivation logic, and all five Server Actions
against real Postgres) and a 9-scenario `e2e/listing-detail.spec.ts`
(one with an axe-core scan) — 158 unit tests and 30 e2e tests total
across the whole suite (every spec file), all passing, confirmed
twice in a row. `npm run typecheck`, `npm run lint`, `npm test`, `npm
run test:e2e`, and `npm run build` all verified green before merging.

## Profile + Account settings implemented (2026-07-13)

**Profile + Account settings: implemented** — all 35 tasks in
`specs/007-profile-and-account-settings/tasks.md` complete, on branch
`007-profile-and-account-settings` (rebuilt on top of `main`), merged
back. The largest feature specced so far, and the largest implemented
so far.

Four real routes under `/profile` sharing one `layout.tsx` (header:
avatar, name, handle, joined year, a trivially-true Online badge, plus
the four tab links): **Overview** (an editable "Games I play" list —
game + optional self-reported rank/hours, a new `userGames` table
richer than onboarding's flat game-name list — an active-postings
preview, and a public-info sidebar); **My postings** (every posting
the user hosts, with status and applicant count, Edit only while no
application has been accepted, Close/Reopen); **Saved** (bookmarked
listings, reusing Listing detail's `toggleSavedListing`/`savedListings`
directly rather than a parallel implementation); **Account** (personal
info, password change gated on having one set, email change with
re-verification reusing Auth & Onboarding's existing helper, privacy
toggles, and a single Deactivate action in a Danger Zone — "Delete
permanently" doesn't exist at all, since ADR 0005 already makes true
deletion impossible platform-wide).

**Schema**: extends `user` with `bio`, `createdAt` (needed for "joined"
display — no earlier feature happened to need it), four privacy
booleans (`privacyShowAge`/`privacyShowRegion`/`privacyShowOnline`/
`privacyDiscoverable` — stored here, consumed by the not-yet-built
Public Profile feature), and `deactivatedAt`. Posting edits reuse Post
a Game's own validation schema directly rather than redefining
title/description/etc. bounds a second time, so the two features'
rules can't silently drift apart.

**`src/auth.ts`'s second amendment**, after Auth & Onboarding's own
Google `profile()` callback: a new `signIn` callback clears
`deactivatedAt` on every successful sign-in (a no-op when already
null), giving FR-013's "reactivates automatically, no separate undo
step" requirement a real implementation. Extracted into a small,
independently testable `reactivate-on-sign-in.ts` helper rather than
inlined directly in the NextAuth config object, so the logic doesn't
require exercising NextAuth's own machinery to unit test — matches
`requireVerifiedEmail()`/`requireAuth()`'s existing pattern of small,
focused, testable auth helpers.

**A bounded amendment to two already-merged features**: `get-open-
postings.ts` (Home) and `search-postings.ts` (Browse, which also
backs `get-facet-counts.ts`) now exclude a deactivated host's postings
from their results — FR-013/SC-005 require it, and Home/Browse are
literally what "shows up to other visitors" means concretely on this
platform today. Same "later feature amends an earlier one's query"
pattern already used repeatedly (e.g. Admin Users' `removedAt`
exclusion of moderated content).

**A real, previously-latent Vitest bug, caught (not caused) by this
feature's own full-suite verification pass**: several integration test
files mutate shared, global Postgres state for real —
`get-trending.test.ts`/`get-facet-counts.test.ts` both do an unscoped
`db.delete(postings)` in their own `beforeAll`, since they aggregate
over the *whole* table — and Vitest's default file-level parallelism
let that race against `search-postings.test.ts`'s own rows (inserted
but never explicitly cleared), intermittently wiping them mid-run. This
exact risk has existed since Browse first wrote that pattern; it
simply never lost the race before now. Root-caused by noticing the
failure count varied across identical reruns (2, 10, 12 failures) —
the signature of a genuine race, not a deterministic bug — then
confirmed by running `search-postings.test.ts` alone (always green)
versus alongside its siblings (flaky). Fixed with the exact reasoning
`playwright.config.ts` already applied to the identical class of
problem: `vitest.config.ts` now sets `fileParallelism: false`, paired
with `pool: "forks"` and `maxWorkers: 1` (the first attempt at
`fileParallelism: false` alone broke Vitest's own runner context
outright on this version's default "threads" pool — a real, if
unrelated, wrinkle in the fix itself). Confirmed stable across 4
consecutive full-suite reruns afterward.

**A real dev-server connection leak, unrelated to this feature's own
code**: mid-session, every Postgres connection attempt started failing
with "sorry, too many clients already" — including a brand-new,
single-connection diagnostic script, ruling out anything-in-app-code
as the immediate cause. Traced to the long-running `next dev` process
(PID alive for this entire multi-hour, many-file-edits session)
holding far more connections than a healthy baseline; killing and
restarting it dropped the count from exhausted to 11 immediately, days
before any other action could have. Not investigated further as a
product bug (would need dedicated reproduction across a fresh session
to confirm whether it's Next.js dev-mode Fast Refresh re-instantiating
`src/db/index.ts`'s module-level client without closing the old one,
or something else) — noted here as an operational fact: if local
Postgres connections mysteriously exhaust during a long dev session,
restarting the dev server is the first thing to try, not a Postgres
service restart (which this environment doesn't have permission to
do) or a database investigation.

**The same `submitting`-flag-never-reset-on-success bug class Listing
detail already found**, this time in `account-forms.tsx`'s password/
email forms and `posting-management-card.tsx`'s edit form — fixed
proactively (all reset `submitting` unconditionally once their action
resolves) rather than waiting to be bitten by it again, since the
pattern was already a known risk going in.

**A confirmed dev-mode-only staleness window, root-caused rather than
worked around with a blind sleep** (the second finding of this exact
class, after Listing detail's Q&A caching discovery): `updateProfile()`/
`updatePrivacy()` had already committed to Postgres by the time their
success state rendered client-side (a Server Action only returns after
its own `await db.update()` resolves) — but an immediate fresh
navigation or `page.reload()` could still render pre-write data for a
few hundred milliseconds under `next dev`, confirmed by reading the
same row through a separate connection immediately versus after a
short delay. Fixed the *tests* with Playwright's `expect(...).toPass()`
retry helper (re-running the whole navigate-and-check step until it
settles), not the product, and not a fixed sleep — the same dev-only
artifact category as Listing detail's confirmed HTTP-cache finding.

**A real e2e locator bug worth remembering**: `div.filter({ has: <a
target> }).last()` doesn't reliably select "the card containing that
target" when the card's own header row is *itself* a div containing
the same target as a nested child — the header row, being deeper in
the tree, wins `.last()` instead of the actual card, silently scoping
every later assertion to the wrong (button-less) element and timing
out. Fixed by adding a second `.filter({ has: <a management button> })`
condition, which the header row lacks, leaving the real card as the
correct deepest survivor among matches satisfying *both* filters.

40+ new unit/integration tests (`profile.ts`'s Zod schemas,
`requireAuth()`'s own gate, and all eight Server Actions against real
Postgres) and an 8-scenario `e2e/profile.spec.ts` (one with an
axe-core scan) — 205 unit tests and 38 e2e tests total across the
whole suite (every spec file), all passing, confirmed twice in a row.
`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`,
and `npm run build` all verified green before merging.

## Blocked Users implemented (2026-07-13)

**Blocked Users: implemented** — all 20 tasks in
`specs/008-blocked-users/tasks.md` complete, merged to `main`.
`/profile/account/blocked` — live count, client-side search over the
already-fetched list, both empty states ("no blocks at all" vs. "no
search match") — plus this project's **first modal-dialog UI**.

**Two new tables**: `blocks` (a block is "active" when `unblockedAt IS
NULL`; never hard-deleted on unblock — ADR 0005's usual exception list
is `SavedListing`/`UserGame`, but a block has real trust/safety history
value, so re-blocking after an unblock creates a *new* row rather than
clearing the old one's `unblockedAt`) and `reports` (this feature's
first writer, `targetType='user'` only, via the Block modal's "Also
report to moderators" checkbox — the not-yet-built Notifications +
Report feature owns every other write path and all moderation/review
UI).

**Native `<dialog>`, no library**: confirmed nothing modal-related was
already installed (`grep -iE "dialog|modal|radix|headless"
package.json` came up empty), so both `unblock-modal.tsx` (one-step
confirm) and `block-modal.tsx` (reusable two-step pick → confirm,
accepting an optional pre-selected target for a future direct-invoke
caller) are built on `showModal()`/`.close()` — real focus-trapping,
Escape-to-close, and focus restoration to the triggering control for
free, plus an implicit `dialog` ARIA role needing no extra plumbing.
This establishes the pattern the future Notifications + Report modal
(`012`) should reuse rather than reinventing.

**Auth gates**: both `block-user.ts` and `unblock-user.ts` extend Auth
& Onboarding's `requireVerifiedEmail()` gate (spec's own explicit call)
— self-block and duplicate-active-block rejection are plain runtime
`if` checks in the Server Action itself (matching Post a Game's
re-validation precedent), not Zod refines, since the schema has no
access to the acting user's own id at definition time. Candidate search
(`searchCandidateUsers()`, called through a thin
`search-block-candidates.ts` Server Action so the Client Component
modal can reach it) only needs `requireAuth()` — searching isn't
itself a block/unblock write — and excludes the searching user, every
actively-blocked target, and any handle-less account (ADR 0006: nothing
to display or block them by).

**Bugs found and fixed while building this feature**:

- A React 19 `react-hooks/set-state-in-effect` lint error in
  `block-modal.tsx`'s reset-on-open logic (resetting `step`/`selected`/
  `query`/etc. every time the modal transitions to open) — fixed by
  moving the reset from a `useEffect` into React's documented
  "adjusting state during render" escape hatch (comparing `open` to a
  tracked `wasOpen` and calling `setState` directly in the render body
  when they differ), which avoids the extra cascading render an
  Effect-based reset would trigger.
- A real, previously-unnoticed accessibility bug, and not unique to
  this feature: the breadcrumb pattern already used on Listing detail
  (a `text-muted` link inline with `text-dim` surrounding text, e.g.
  "Account / Blocked users") fails axe's `link-in-text-block` rule —
  1.38:1 contrast against the required 3:1, with no underline to
  otherwise distinguish it. Fixed *this* feature's own breadcrumb link
  with `underline underline-offset-2`; Listing detail's identical
  pattern was left as-is (out of scope here) but is now a known,
  documented gap worth a bounded fix whenever that page is next
  touched.
- The same dev-server Postgres connection-exhaustion issue hit earlier
  this session recurred mid-verification ("sorry, too many clients
  already," surfacing as unrelated failures in `profile.spec.ts`/
  `signup-onboarding.spec.ts`/`skip-onboarding.spec.ts`, not this
  feature's own code) — same root cause and same fix: killed the
  long-running `next dev` process (confirmed via
  `Get-CimInstance Win32_Process`) and restarted it. The full e2e suite
  then passed twice in a row with no code changes required, confirming
  it was purely operational, not a regression.

25+ new unit/integration tests (`blocking.ts`'s Zod schemas,
`block-user.ts`/`unblock-user.ts` against real Postgres) and a
2-scenario `e2e/blocked-users.spec.ts` covering quickstart.md Scenarios
1-2 end to end, including axe-core scans of both modals (Scenario 3 —
the unverified-user gate — is covered by the unit tests' own
unverified-session cases, not separately scripted in e2e, consistent
with how this project has handled auth-provider-dependent scenarios
elsewhere). 220 unit tests and 40 e2e tests total across the whole
suite, all passing, confirmed twice in a row after the connection-leak
fix. `npm run typecheck`, `npm run lint`, `npm test`, `npm run
test:e2e`, and `npm run build` all verified green before merging.

## Forum index implemented (2026-07-13)

**Forum index: implemented** — all 22 tasks in
`specs/009-forum-index/tasks.md` complete, merged to `main`. `/forum`
is public to read (FR-001) — category chips (six hardcoded keys plus
"All," each with an accurate, always-unfiltered count), a debounced
search, and a Latest/Top/Unanswered sort, all server-side and
URL-driven (`searchParams`, Browse's precedent) rather than client-side
state, since threads accumulate indefinitely unlike Home's small
recent slice.

**New `forumThreads` table**, this feature's first writer. Categories
stay a hardcoded `const` (`src/lib/forum/categories.ts`), not a table —
the same treatment already given vibe/platform/region. Pinned threads
always sort first regardless of the selected sort; "HOT" is computed
at read time (`isHotThread()`: `replyCount`/age-in-hours past a fixed
threshold, age floored at 1 hour to avoid a divide-by-near-zero spike
for a brand-new thread) and never shown alongside PINNED, which stays
a real, moderator-controlled stored column this feature only ever
writes `false` to (the future Admin Forum feature owns setting it).
`reply`/`view`/`like` counts all start at 0, maintained by the future
Forum Thread feature, not this one.

**The New Thread modal reuses Blocked Users' native-`<dialog>` pattern**
(`showModal()`/`.close()`, focus-trapping, Escape-to-close) as its own
component, not a shared one — different fields (category select,
title, body, comma-separated tags reusing Post a Game's own
`toStringArray` preprocessing pattern), so there was nothing to share
by direct import, only the interaction approach. `create-thread.ts`
extends Auth & Onboarding's `requireVerifiedEmail()` gate; an
unauthenticated visitor clicking "+ New thread" is routed straight to
`/login` via a real `<Link>` (Listing detail's `apply-panel.tsx`
precedent — the button itself is swapped server-side based on session
state, not a client-side redirect after the fact).

**Bugs found and fixed while building this feature**:

- A genuine e2e test-authoring race, not a product bug: clicking the
  "All" category chip and then immediately typing in the search box
  (two different URL-updating controls, back to back) could have the
  debounced search update read a *stale* `searchParams` snapshot
  (captured before the category chip's own `router.replace()` had
  actually flowed back into the hook), silently re-adding the just-
  cleared category filter. Fixed in the test itself by asserting the
  URL actually reflects each change before triggering the next one —
  any future e2e test driving two independent URL-search-param
  controls in quick succession should do the same, not assume a click
  settles before the next action starts.
- The `SearchInput` needed to be keyed by the URL's own `q` value
  (not just seeded from it once) so an *externally*-driven query change
  — selecting a trending tag from the right rail, a different
  component entirely — correctly resets the search box's local
  debounce state instead of going stale. A plain `useState(initial)`
  with no re-sync would have left the visible input text wrong after a
  trending-tag click even though the URL and results were already
  correct.
- A real React 19 `set-state-in-effect` lint catch, same class Blocked
  Users' `block-modal.tsx` already hit: `new-thread-modal.tsx`'s own
  reset-on-open logic followed the same fix (adjusting state during
  render via a tracked `wasOpen`, not inside a `useEffect`) proactively,
  since the pattern was already a known risk going in.

25+ new unit/integration tests (`forum.ts`'s Zod schemas, the HOT
heuristic, `search-threads.ts`/`get-forum-stats.ts` against real
Postgres, `create-thread.ts`'s verified/unverified/invalid-category
cases) and a 2-scenario `e2e/forum-index.spec.ts` covering
quickstart.md Scenarios 1-2 end to end, including an axe-core scan of
the New Thread modal (Scenario 2's unverified-user gate is covered by
the unit tests' own case, not separately scripted in e2e, consistent
with how this project has handled auth-gate scenarios elsewhere). 248
unit tests and 42 e2e tests total across the whole suite, all passing,
confirmed twice in a row. `npm run typecheck`, `npm run lint`, `npm
test`, `npm run test:e2e`, and `npm run build` all verified green
before merging.

## Forum Thread implemented (2026-07-13)

**Forum Thread: implemented** — all 28 tasks in
`specs/010-forum-thread/tasks.md` complete, merged to `main` — the
largest feature built so far (3 user stories, 3 new tables, 4 Server
Actions, a second writer of `reports`). `/forum/thread/[id]`, public
to read (FR-001) — the original post renders distinctly via an OP
badge and reflects the thread's own `pinned`/computed-HOT state
exactly as Forum index already defines it (this feature never sets
either). View count increments once per page load, no per-visitor
dedup, incremented before the read so the number shown reflects the
current visit.

**Reply sort is client-side, deliberately different from Forum
index's server-side/URL-driven category-sort choice**: a single
thread's own reply count is bounded (unlike Forum index's ever-growing
cross-category thread list, the actual reason THAT page chose
server-side filtering), so fetching every reply once and sorting
Top/Newest/Oldest in the browser is simpler and avoids re-fetching
complexity, while still keeping the ephemeral "currently quoting X"
state trivially colocated in the same client component.

**Likes are a real per-user relationship, not a bare counter**: a new
`likes` table with a database-level unique constraint on `(userId,
targetType, targetId)` is the actual enforcement point for "can't
double-like," not just an application-level check — verified with a
deterministic test that directly attempts a duplicate insert and
confirms the constraint rejects it (a Promise.all-based "two
concurrent toggle clicks" test was tried first and rejected — see
below). `forumThreads.likes`/`forumReplies.likes` stay denormalized for
fast reads, kept in sync transactionally on every like/unlike.

**Reusing Blocked Users' `reports` table as this feature's second
writer** (`targetType='forum'`, `targetId` = either the thread's or a
reply's id, with nothing in the row itself distinguishing which — a
future Admin Forum reader would need to check both tables) — no new
report shape, still no review/queue UI. `threadSubscriptions` stores a
per-user preference only; nothing reads it to send a notification
yet, consistent with the platform's already-narrowed notification
scope.

**Dropped the wireframe's "TOP REPLY"/best-answer badge entirely** —
no control anywhere sets it (research.md #4), the same "no real input
path" reasoning Blocked Users' fake per-block "reason" chips and this
project's HOT-heuristic decision already established. The separate,
real "Top" sort (by like count) is unaffected and kept.

**A genuine test-design lesson worth remembering**: firing two
concurrent `toggleLike()` calls at the SAME target isn't a reliable
way to test "duplicate-like prevention" — toggle semantics mean a
second request that happens to see the first's already-committed
insert takes the *unlike* branch instead of attempting a duplicate
insert, a real and order-dependent outcome of rapid toggling, not a
bug. The actual constraint is best verified directly (two raw inserts
of the identical row, confirming the second throws) rather than through
a race that may or may not manifest the specific code path being
tested.

**Every write action (reply/like/report/subscribe) is routed to
`/login` via a real `<Link>` for an unauthenticated visitor** — the
same `apply-panel.tsx` precedent from Listing detail, threaded through
four separate small reusable components (`LikeButton`, `ReportButton`,
`SubscribeButton`, `ReplyComposer`) rather than one shared gate, since
each has its own distinct interactive shape.

35+ new unit/integration tests (`forum-thread.ts`'s Zod schemas,
`get-thread.ts`'s sort/related-thread/quoted-reply logic against real
Postgres, all four Server Actions including the direct unique-
constraint tests) and a 3-scenario `e2e/forum-thread.spec.ts` covering
quickstart.md Scenarios 1-3 end to end, including an axe-core scan.
284 unit tests and 45 e2e tests total across the whole suite, all
passing, confirmed twice in a row. `npm run typecheck`, `npm run
lint`, `npm test`, `npm run test:e2e`, and `npm run build` all
verified green before merging.

## Inbox / messaging implemented (2026-07-14)

**Inbox / messaging: implemented** — all 31 tasks in
`specs/011-inbox-messaging/tasks.md` complete, merged to `main`. A
two-pane `/inbox` (conversation-list layout + `/inbox/[id]` chat pane)
merging real `conversations` the user belongs to with pending
Applications on postings they host into one searchable, unified list
(FR-002) — search is client-side (Forum Thread's own reply-sort
precedent: a single user's own inbox is a bounded, single-parent list,
unlike Forum index's ever-growing cross-category thread list).

**New `conversations`/`messages` tables** — `conversations.lastReadAt`
is a per-member JSON map (`{userId: ISO timestamp}`), added beyond
data-model.md's original two-column sketch for the same reason
`threadSubscriptions`' unique constraint was added retroactively during
Forum Thread: FR-002/FR-004's "accurate unread indicator" can't be
satisfied without some per-viewer read cursor, and a JSON column on a
table this feature already owns is the smallest addition that works.
A pending Application's own `message` field doubles as a synthesized
"request" list item's opening line — no `Conversation`/`Message` row
exists for it until the host accepts (research.md #1), avoiding any
amendment to Listing detail's already-merged `apply-to-posting.ts`.

**`accept-request.ts` is this project's first `db.transaction()`** —
Application status, the posting's `seatsOpen`/`status`, and a new
`Conversation` (with a system message) all change together. The
guarded update is checked via `.returning()`, not just fired blind: if
a concurrent accept already won, the WHERE clause matches zero rows and
the whole transaction throws/rolls back, rather than double-decrementing
`seatsOpen` or creating two conversations. Verified with a genuine
concurrent-call test (`Promise.all` of two `acceptRequest()` calls on
the same pending Application, asserting exactly one wins and `seatsOpen`
decrements exactly once) — this is a *valid* use of concurrent-call
testing, unlike Forum Thread's own toggle-race lesson: accepting is a
one-way state transition guarded by a WHERE clause, not a toggle, so
there's no ambiguity about which branch a second concurrent call takes.

**`search-contacts.ts` excludes a block in *either* direction** —
Blocked Users' own `search-users.ts` only excludes users the searching
user has blocked (all its own "pick someone to block" flow needs); this
feature is the first to also exclude someone who has blocked the
searching user, since messaging is exactly the interaction Blocked
Users' own UI promises blocking prevents. `start-conversation.ts`
re-checks the same relationship server-side per recipient — the compose
search's own exclusion is a UX nicety, not the real guard.

**Three real bugs found and fixed**:

1. A native `<dialog>` styled with a bare Tailwind `flex` utility
   never actually hides when closed. Tailwind v4 emits utilities inside
   `@layer`, and per the CSS cascade-layers spec, layered author styles
   always win over the User-Agent stylesheet's `dialog:not([open]) {
   display: none }` rule *regardless of selector specificity* — confirmed
   by inspecting `getComputedStyle(dialog).display` directly (`"flex"`
   while closed, no `open` attribute). Fixed via `hidden open:flex`
   (Tailwind's `open:` variant targets the `[open]` attribute). The same
   latent bug is likely present in Blocked Users'/Forum index's own
   `<dialog>`-based modals (`block-modal.tsx`, `new-thread-modal.tsx`) —
   left unfixed there as out of this feature's own scope, worth a
   follow-up pass.
2. This Next.js version's client `router.refresh()`, called immediately
   after `router.push()` to a different route, can lose a race and
   revert the browser back to the pre-push URL — confirmed via dev-server
   logs showing the pushed route's own fetch succeeding server-side while
   the browser still displayed the old URL. This app's Next.js version
   (per `node_modules/next/dist/docs/`) has moved cache/router
   invalidation into Server Actions themselves: `next/cache`'s `refresh()`
   and `revalidatePath()` are now Server-Action-only APIs. Fixed by
   calling `revalidatePath("/inbox", "layout")` server-side inside
   `start-conversation.ts`/`accept-request.ts`/`decline-request.ts`
   right before returning, with client code doing a bare `router.push()`
   afterward and nothing else. `next/cache` is mocked globally in
   `vitest.setup.ts` since it requires a real Next.js request context
   that doesn't exist under Vitest.
3. A Playwright `getByText()` assertion produced a false positive,
   matching a message composer `<textarea>`'s still-pending typed value
   before its async `sendMessage()` call had actually resolved and
   written to the database — fixed by first asserting the textarea
   cleared (the send-succeeded signal), then checking for the rendered
   message bubble specifically.

Every write action (send/start/accept/decline) extends
`requireVerifiedEmail()`; viewing `/inbox` itself only needs a plain
session (`auth()` + redirect, Profile's own layout.tsx precedent) since
reads are never blocked, only writes.

40+ new unit/integration tests (Zod schemas, `get-inbox-list.ts`'s
merge/sort/unread logic, `get-conversation.ts`'s conversation-or-request
lookup, all four Server Actions including the transaction's concurrency
test) and a 6-scenario `e2e/inbox.spec.ts` covering quickstart.md
Scenarios 1-3 plus the unauthenticated-redirect and group-sender-
grouping cases, including two axe-core scans. 51 e2e tests and 327
unit tests total across the whole suite, all passing, confirmed twice
in a row (both after a full dev-server restart — the long-running dev
server had accumulated enough stale Postgres connections across this
session's many HMR reloads to trip local Postgres's `max_connections`
mid-suite, the same known "too many clients" issue noted in earlier
features; a fresh server resolved it cleanly, unrelated to this
feature's own code). `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:e2e`, and `npm run build` all verified green before
merging.

## Notifications + Report modal implemented (2026-07-13)

**Notifications + Report modal: implemented** — all 25 tasks in
`specs/012-notifications-and-report-modal/tasks.md` complete, merged to
`main`. A nav-level bell dropdown (accurate unread count + preview of
the most recent unread items) plus a full `/notifications` page
(All/Unread/Requests/Forum/System filters, Today/Earlier grouping,
mark-read/mark-all-read, an empty state), and a reusable, canonical
3-step Report modal (reason taxonomy → optional details + "Also block"
→ done).

**New `notifications` table and a `createNotification()` helper** —
shipped with zero live callers, on purpose (research.md #1, matching
the same pattern already established by `requireVerifiedEmail()`/
`requireRole()`): retrofitting every already-existing write action
(apply, accept/decline, forum reply/mention, direct message) to
actually call it is each of those already-merged features' own
follow-up, tracked in `docs/future-work.md`. This feature demonstrates
the mechanism against seeded data and one genuinely live source:
pending/resolved join-request `applications` are synthesized into
"request" notification items exactly like Inbox's own merged
`/inbox` list, except this feed also keeps `accepted`/`declined` ones
around (Inbox's own request list only ever shows `pending`) so a
resolved request still displays its resolved state ("✓ You added
@handle to your party" / "Request declined") instead of vanishing.
Accept/Decline on a request notification call Inbox's (`011`) existing
`accept-request.ts`/`decline-request.ts` directly — no duplicated
Application/Posting/Conversation transaction logic.

**Extends Blocked Users' (`008`) `reports` table** with its first real
`reason` values (Blocked Users'/Forum Thread's existing writes continue
to leave it null) and a new `details` column — data-model.md's original
sketch specified `details` as a Zod-validated field but never actually
added a column to persist it, a gap only surfaced once the write path
was actually implemented (the same class of retroactive schema fix as
Inbox's `lastReadAt`/Forum Thread's `threadSubscriptions` unique
constraint). `submit-report.ts` decouples "what's being reported" from
"who gets blocked" via an explicit `blockUserId`, separate from
`targetId` — reporting a posting targets the posting, but "Also block"
needs to block its *host*, not the posting id itself; report-modal.tsx
only renders the block checkbox when its caller supplies one.

**Retroactively un-defers Listing detail's (`006`) Report action** —
T030, previously blocked on this feature existing, is now complete: the
apply panel's Report button targets the posting (blocking its host),
and each Q&A entry's Report link targets its own asker directly
(`targetType='user'`, since `reports.targetType`'s fixed enum has no
"question" variant).

**Three real issues found and fixed**:

1. No shared nav shell exists anywhere in this codebase — every prior
   feature's spec explicitly deferred "the top nav bar" as future
   Design System infrastructure and simply rendered none, so there was
   no slot for a persistent bell to live in. Rather than either
   building a full global nav (real scope creep) or skipping the bell's
   cross-page reachability (failing FR-001), this feature created the
   smallest possible slot itself: a thin sticky `SiteHeader` (logo +
   bell only, no nav links) mounted once in the root layout, rendering
   nothing for an unauthenticated visitor. The one real side effect:
   Inbox's own `/inbox` layout used a fixed `h-screen` two-pane grid,
   which would now overflow the viewport by the new header's height —
   fixed with a one-line `h-[calc(100vh-3.5rem)]` amendment.
2. A client component (`notifications-list.tsx`) imported
   `filterAndGroupNotifications` — a runtime function — from the same
   module that also exported the DB-touching `getNotifications()`.
   Importing any runtime value (not just a type) from a module pulls
   the *entire* module into the client bundle, so Turbopack tried to
   bundle the `postgres` driver for the browser and crashed every
   single page in the app (`Module not found: Can't resolve 'fs'`).
   Inbox's own `conversation-list.tsx` imports `InboxItem` from
   `get-inbox-list.ts` the same way this file imported types, but as a
   `type`-only import, which TypeScript erases entirely — that's why
   Inbox never hit this. Fixed by splitting the pure, DB-free
   filter/grouping logic and its types into their own
   `filter-notifications.ts`, safe for client components to import from
   directly; `get-notifications.ts` now holds only the server-only
   `getNotifications()` DB query. Caught immediately by the first real
   e2e run (every test failed at the login page, which was itself
   broken by this bundle crash) rather than by typecheck/lint/unit
   tests, none of which exercise real bundling.
3. The same axe-core color-contrast violation class Inbox already hit
   once (`request-banner.tsx`'s `text-dim` on an accent-tinted
   background) recurred here: the Report modal's reason description
   text at `text-dim` on a selected reason's `bg-accent-2/10`
   background measured 4.37:1 against the required 4.5:1. Fixed the
   same way — switched to `text-muted`.

Also found and fixed a genuine test-authoring bug in this feature's own
e2e spec, not a product bug: two early draft assertions ("the Requests
filter is empty" and "0 unread after Mark all read") assumed pending
join-requests had already been resolved by tests that actually run
*later* in the same file — fixed by asserting the correct in-progress
counts (2 pending, not 0) and adding a dedicated, fully isolated user
with zero data for the one legitimate empty-state check.

Every write action (mark-read/mark-all-read/submit-report) extends
`requireVerifiedEmail()`, matching this project's uniform convention
even for lightweight actions (Post a Game's `toggleSavedListing`
precedent) rather than inventing a lighter "just logged in" tier.

30+ new unit/integration tests (Zod schemas, `filter-notifications.ts`'s
pure filter/group logic, `create-notification.ts`, `get-notifications.ts`'s
merge behavior including the withdrawn-application exclusion, both
mark-read actions, and `submit-report.ts` including the decoupled-block
case) and a 9-scenario `e2e/notifications.spec.ts` covering quickstart.md
Scenarios 1-3 plus the unauthenticated-redirect and empty-state cases,
with three axe-core scans (bell dropdown, notifications page, report
modal). 359 unit tests and 60 e2e tests total across the whole suite,
all passing, confirmed twice in a row (after killing a long-lived,
session-stale dev server process holding port 3000 — the same recurring
"too many clients"-class issue noted in earlier features, unrelated to
this feature's own code). `npm run typecheck`, `npm run lint`,
`npm test`, `npm run test:e2e`, and `npm run build` all verified green
before merging.

## News feed implemented (2026-07-13)

**News feed: implemented** — all 19 tasks in
`specs/013-news-feed/tasks.md` complete, merged to `main`. The public
`/news` page, no login required, with a single featured post shown
only when no category filter or search is active, server-side
URL-driven category/search (Browse/Forum index's precedent, since
posts accumulate indefinitely), cumulative "Load more" pagination, and
a no-account-required newsletter subscribe strip.

**New `newsPosts` table** — minimal, read-only from this feature
(`title`/`excerpt`/`category`/`cover`/`readTimeMinutes`/`featured`/
`upcoming`/`publishedAt`), the same "define just what this feature
needs" pattern Home used for `postings` before Post a Game existed —
the future Admin News feature is the canonical writer and extends it.
`search-news.ts` fetches one extra row past the page limit to cheaply
derive `hasMore` without a separate `COUNT` query, and folds the
featured post into ordinary filtering (rather than excluding it
entirely) once any category/search is active, matching spec.md's edge
case.

**New `newsletterSubscribers` table and `subscribe-newsletter.ts`** —
this project's first write action with genuinely no session check at
all (a marketing email-capture form works the same whether or not the
visitor is logged in); `email`'s database-level unique constraint is
the actual duplicate-prevention mechanism, not an application-level
check, mirroring `likes`' own precedent.

**Two real, previously-latent bugs found and fixed, both pre-existing
and unrelated to this feature's own new code**:

1. **A shared `isUniqueViolation()`-style helper never actually worked,
   in FIVE separate files.** `toggle-like.ts`, `toggle-subscription.ts`,
   Auth & Onboarding's `register/route.ts`, and Profile's
   `update-email.ts` all independently wrote the same check:
   `"code" in err && err.code === "23505"`. Reproduced directly (insert
   the same unique value twice, inspect the thrown error): Drizzle
   wraps the raw `postgres.js` error in a `DrizzleQueryError`, whose own
   `code` property is `undefined` — the real Postgres error code lives
   one level down, at `err.cause.code`. Every one of those catch
   branches had silently never matched a real duplicate-key error; each
   was harmless in its own normal control flow only because the
   surrounding code does a SELECT-based existence check before the
   INSERT, making the catch a race-only backstop that (until now) never
   actually caught anything. Fixed identically across all five call
   sites. **Any future write action reaching for this pattern should
   check `err.cause?.code` (falling back to `err.code`), not `err.code`
   alone.**
2. **Two sibling dev-only seed scripts collided the moment a second one
   existed.** `scripts/seed-postings.ts` and the new
   `scripts/seed-news-posts.ts` both use only dynamic `await import()`
   (deferred past a `process.loadEnvFile()` call) with no top-level
   static import/export — TypeScript's default module detection treats
   such a file as a global script, not a module, so both files' own
   `async function main()` declarations landed in the same shared
   global scope and collided (`TS2393: Duplicate function
   implementation`). Fixed by adding `export {}` to both, forcing
   explicit module scope. **Any future standalone dev script with this
   exact shape (env-load-then-dynamic-import, no static imports) needs
   the same `export {}` the moment a second such script exists.**

30+ new unit/integration tests (Zod schemas, `search-news.ts`'s
featured-exclusion/AND-filtering/pagination logic including the
whole-table test-isolation discipline Home's own `getTrending()` bug
already established as necessary here, and `subscribe-newsletter.ts`'s
duplicate-rejection) and a 7-scenario `e2e/news-feed.spec.ts` covering
quickstart.md Scenarios 1-2, with two axe-core scans. 380 unit tests
and 67 e2e tests total across the whole suite, all passing, confirmed
twice in a row. `npm run typecheck`, `npm run lint`, `npm test`, `npm
run test:e2e`, and `npm run build` all verified green before merging.

## Content Page implemented (2026-07-14)

**Content Page: implemented** — all 21 tasks in
`specs/014-content-page/tasks.md` complete, merged to `main`. A
slug-based public page at `/pages/[slug]`, block-rendered from a single
JSONB array (Heading/Paragraph/List/Quote/Callout/Divider) on a new
`contentPages` table, with an inline moderator-or-higher edit mode
directly on the page itself (no separate admin editor screen): batched
local-state add/reorder/delete/edit with an explicit Save/Cancel (no
per-keystroke autosave), and an independent Publish/Unpublish toggle.
An unpublished (draft) page is indistinguishable from a genuinely
missing slug for anyone below moderator — both 404, never a "coming
soon" state, so drafts can't be discovered by URL-guessing.

**`require-role.ts` (Error Pages, 002)'s first real consumer** — both
the draft-visibility check and the two new Server Actions
(`save-content-page.ts`, `toggle-page-status.ts`) call it directly.
Its rank check is still hardcoded to `user` for every session (no
`role` column exists until Admin Settings/024 adds one), so **today,
every real session — including a genuinely logged-in one — is rejected
by the moderator gate**, same as before this feature existed. This is
expected, not a bug: the page-load check wraps `requireRole` in a
try/catch specifically to convert that rejection into the same
`notFound()` a missing slug gets (never leaking that a draft exists via
a distinct 401/403), and the two Server Actions call it directly,
un-caught, so a rejection renders the same forbidden/unauthorized
boundary any future `/admin/*` page will eventually use.

**Real, structural consequence for testing**: User Story 2 (inline
edit) and User Story 3 (publish/unpublish) are fully implemented, real
code paths — but no test account, however constructed, can currently
pass `requireRole("moderator")` to exercise them through an actual
browser session. Handled by mocking `requireRole` directly in
`save-content-page.test.ts`/`toggle-page-status.test.ts` (proving the
persistence logic is correct once a real moderator session exists,
exactly what Admin Settings shipping the `role` column will unlock)
plus a real rejection-path test with `requireRole` throwing (today's
actual behavior). `e2e/content-page.spec.ts` covers what's genuinely
reachable today: public reading (all six block types, axe-clean),
404 for a missing slug, 404 for a draft page for both an anonymous
visitor and a logged-in non-moderator, and confirming no edit controls
render for that non-moderator session either. **US2/US3's "a real
moderator succeeds" scenario stays untestable end-to-end until Admin
Settings (024) ships — revisit `e2e/content-page.spec.ts` then.**

21 new unit/integration tests (block discriminated-union Zod schema,
`get-content-page.ts`, and both Server Actions) and a 4-scenario
`e2e/content-page.spec.ts` with one axe-core scan. 401 unit tests and
71 e2e tests total across the whole suite, all passing, confirmed
twice in a row. `npm run typecheck`, `npm run lint`, `npm test`, `npm
run test:e2e`, and `npm run build` all verified green before merging.

## Real global nav shell built (2026-07-14)

Prompted by the user asking, after 14 features' worth of pages were
already live, why the deployed site still only seemed to show Home —
every one of those pages (Browse, Forum, News, Listing detail, Content
pages, ...) was real and reachable by URL the whole time, just not
discoverable: every feature so far had explicitly deferred the top nav
as future Design System infrastructure and rendered nothing but a bare
logo + notification bell (`site-header.tsx`). Design System / shared UI
primitives are exempt from the per-feature spec/plan/tasks gate (built
directly, per the constitution), so this was built now rather than
waiting for its own spec.

**What shipped**: `site-header.tsx` rewritten into a real nav —
Browse/Forum/News links (`nav-links.tsx`, active-state via
`usePathname()`), a "Post a game" CTA, and for a signed-in visitor an
avatar dropdown (`profile-menu.tsx`: Profile, Inbox, Log out) next to
the existing notification bell. Groups is deliberately omitted even
though `sitemap.md`'s nav line still lists it — same "encode the
decision, not the stale doc" precedent as the age-policy/hard-deletes
ADRs (product vision already deferred Groups entirely). **This is also
the very first place a signed-in user can log out anywhere in the
app** — no such control existed before this.

**Two real bugs found and fixed while verifying against the existing
e2e suite** (not speculative — both broke real tests):

1. **Maintenance mode is a proxy.ts *rewrite*, not a distinct route**
   (the browser URL stays whatever the visitor originally requested,
   e.g. `/`) — so the first attempt at hiding the nav on maintenance via
   client-side `usePathname()` matching literal `"/maintenance"` could
   never actually catch it; the nav kept rendering during a real
   maintenance-mode visit. Fixed by checking `getSettings()` directly
   inside `site-header.tsx` itself (the same flag `proxy.ts` already
   gates on, cheap and already cached) instead of guessing from the URL.
2. **A duplicate/orphaned landmark regression on `ErrorState`** (backs
   404/500/maintenance): it rendered its own decorative `<header>` with
   a small logo, which — now that a real global nav `<header>` exists —
   tripped axe-core's "at most one banner landmark" rule on 404/500 (both
   headers present at once). Converting it to a plain `<div>` fixed that
   but introduced a *different* violation ("all page content should be
   contained by landmarks" — the logo Link sat outside `<main>`,
   contained by nothing). Resolved by removing it outright: it was fully
   redundant with the real nav's own logo on every page it's shown on,
   except actual maintenance mode, where the nav is intentionally hidden
   and a "go home" link would be moot anyway (every route redirects
   there).

No new schema/tests were needed (pure UI infrastructure), but the full
existing suite was the real verification: it caught both bugs above.
`npm run typecheck`, `npm run lint`, the full unit suite (401, unaffected)
and the full e2e suite (71) all green, e2e confirmed twice in a row,
`npm run build` confirmed twice.

## CI had been silently failing since Error Pages shipped (2026-07-14)

The user was getting a steady stream of "CI: All jobs have failed"
GitHub emails and asked about it. GitHub Actions run history showed
CI green through run #125 ("docs: mark Auth & Onboarding implemented")
and failing on **every single run since** #126 ("docs: mark Error
Pages implemented") — 23 consecutive failures across every feature
merged this whole session, none of it ever surfaced because local
verification (this session's own typecheck/lint/vitest/playwright/
build discipline) was the only thing actually checked before merging.

**Root cause**: `ci.yml`'s "Push Drizzle schema to the CI database"
step runs `drizzle-kit push --force` against a brand-new, empty
Postgres service container for every run — and `push` only applies
structural DDL, never a migration file's seed `INSERT`s (the exact
same gap behind today's earlier "prod DB migration gap" incident above,
just surfacing here as a CI failure instead of a production 500). Error
Pages' own migration seeds exactly one `settings` row so
`get-settings.ts` never has to handle "no row yet" — but
`e2e/maintenance.spec.ts`'s own `setMaintenance()` helper assumed that
row already existed (`const [row] = await db.select()...; ...
where(eq(settings.id, row.id))`), so on a freshly-pushed CI database
`row` was `undefined` and `row.id` threw, failing that spec file (and
therefore the whole `npm run test:e2e` step, and therefore the whole
job) on every run touching real code from Error Pages onward.

Fixed by making the helper insert a row if none exists rather than
assuming an UPDATE will always find one. Verified by literally
reproducing the CI scenario locally (cleared the local `settings`
table entirely, confirmed the test failed the old way, applied the
fix, confirmed it now passes against a truly empty table). No other
e2e spec has this same "assumes a pre-seeded singleton row" shape
(checked: `maintenance.spec.ts` was the only file calling `.limit(1)`
in `e2e/`). **CI is still failing after this fix** — reproduced the
exact CI scenario locally (a truly fresh Postgres database, `drizzle-kit
push --force`, matching placeholder `AUTH_SECRET`/Google env vars, `CI=true`)
and the full 71-test e2e suite passed clean, so whatever's still
failing in the real GitHub Actions run is specific to that environment
in a way this reproduction didn't capture — couldn't pull the actual
Playwright failure output to diagnose further (`gh` isn't authenticated
in this environment, and the raw job-logs API requires auth even for
public repos). Needs either a `GH_TOKEN`/`gh auth login` to actually
read the failing run's output, or the user checking the Playwright
HTML report artifact GitHub Actions uploads on failure.

## Two more real bugs found and fixed (2026-07-14), from user reports

**Google OAuth sign-ins were permanently stuck "unverified," blocking
posting/applying/messaging, with no way to ever pass verification.**
`src/auth.ts`'s Google provider `profile()` correctly computes
`emailVerified` from Google's own `email_verified` claim — but
`@auth/core`'s own OAuth callback handler unconditionally forces
`emailVerified: null` when creating a brand-new user with no existing
account found, overriding it. This is core `next-auth`/`@auth/core`
behavior, not something fixable via provider config. Fixed by adding
`verify-google-email.ts` (unit tested), called from the existing
`signIn` callback for any Google sign-in where Google's own claim says
verified — runs on every sign-in, not just creation, so it also
retroactively fixes any account already stuck this way. The user's own
already-stuck production account was manually patched at the same time
so they weren't blocked waiting for the next deploy.

**A systemic dialog-centering bug affecting every native `<dialog>`-based
modal in the app** (`block-modal.tsx`, `unblock-modal.tsx`,
`compose-modal.tsx`, `new-thread-modal.tsx`, `report-modal.tsx` — Blocked
Users, Inbox, Forum, and Notifications respectively). Tailwind's
preflight resets `margin: 0` on every element, silently overriding the
browser's own UA-stylesheet centering rule for an open modal dialog
(`dialog:modal { margin: auto }`) — every one of these modals has been
rendering pinned to the top-left of the viewport, not centered, since
its own feature shipped. Never caught by any e2e test because
Playwright's functional assertions (element present, text visible,
click works) don't care about visual centering, and axe-core doesn't
check it either — purely a visual defect invisible to every automated
check this project runs. Found by reproducing a user's screenshot
report directly with a throwaway Playwright script (log in, open the
New Thread modal, resize, screenshot) confirming the dialog was
mispositioned even before any resize. Fixed with one global CSS rule
(`dialog:modal { margin: auto; }` in `globals.css`) restoring the
browser default for every dialog-based modal in the app at once, and
any future one for free — confirmed by re-running the same repro
script and inspecting the resulting screenshots.

Full suite (402 unit, 71 e2e) green, e2e confirmed twice in a row,
`npm run build` confirmed twice.

## A more severe dialog bug, found via a second user report (2026-07-14)

After the centering fix above shipped, the user sent a screenshot from
an **incognito window** showing the Forum's "New thread" modal still
visible as a small, mispositioned Cancel/Post-thread fragment stuck in
the top-left corner — after it had supposedly been closed. This was a
second, more severe bug hiding behind the first one.

**Root cause**: `block-modal.tsx` and `new-thread-modal.tsx` both used
an unconditional `className="flex ..."` on their `<dialog>` element.
CSS cascade rule: author-stylesheet rules (Tailwind classes) always
beat user-agent-stylesheet rules, regardless of selector specificity.
The browser's own UA rule `dialog:not([open]) { display: none }` is
what makes a closed dialog disappear — but an unconditional `flex`
class permanently forces `display: flex`, so these two dialogs could
**never actually hide** after `.close()`. They just lost centering
(reverting to `position: fixed; margin: 0`, i.e. pinned top-left) while
staying fully rendered and interactive forever. Confirmed with a
diagnostic script: after closing, `hasAttribute("open")` was `false`
but computed `display` was still `"flex"` with a full-size bounding
rect at `(0, 0)`.

`report-modal.tsx` and `compose-modal.tsx` already used the correct
`"hidden ... open:flex ..."` pattern (Tailwind's `open:` variant only
applies `flex` when the dialog's `open` attribute is present) and never
had this bug — that pattern is now applied to all five dialogs. Fixed
`block-modal.tsx` and `new-thread-modal.tsx` to match. Verified locally
via a throwaway Playwright script (sign up, open New Thread modal,
click Cancel, inspect `display`/bounding rect): `display: "none"` and a
zero-dimension rect after the fix, plus a clean screenshot with no
artifact.

**Separately**, the user pasted all 16 real CI log documents from a
still-failing GitHub Actions run (the settings-row fix above resolved
one failure but not the whole job). The logs showed two more failures,
both in files untouched by any recent commit:
- `e2e/inbox.spec.ts`: a genuine strict-mode-violation race — a
  freshly-sent message's text matched both the sidebar's conversation-
  list preview *and* the message thread's own bubble once the send
  resolved, so an unscoped `getByText(freshMessage)` hit two elements.
  Fixed by scoping the assertion to the thread's own
  `[aria-live="polite"]` region. This was a real, pre-existing
  assertion ambiguity, not a product bug.
- `e2e/browse.spec.ts`: "multi-select OR within a facet, AND across
  facets" times out waiting for a heading after selecting a facet.
  Investigated (full test, the `selectFacet` helper, and
  `use-browse-url-params.ts`'s lack of any debounce on
  `router.replace()`) but **not yet fixed** — never reproduced locally
  across many full-suite runs this session, so this remains an open,
  CI-environment-specific failure.

Full suite reconfirmed after these two fixes: 402 unit tests and 71
e2e tests green (the first post-fix e2e run showed 16 failures, but
all were `net::ERR_CONNECTION_REFUSED` against two stale `next start
-p 3001` production-build servers left running from the previous day's
work, unrelated to these code changes — killed those processes and
reran clean). `npm run build` confirmed twice.

## Forum thread pages 500'd for any thread posted with no tags (2026-07-14)

The user hit a 500 opening the thread they'd just posted and gave the
error digest from Vercel's error overlay (`1041041217`). Pulled
production runtime logs directly (`vercel logs` / Vercel's error
clustering) and matched that exact digest to `Error: arrayOverlaps
requires at least one value` on `GET /forum/thread/[id]`.

**Root cause**: `get-thread.ts`'s "related threads" query calls
Drizzle's `arrayOverlaps(forumThreads.tags, thread.tags)` unconditionally
— but `arrayOverlaps` throws if given an empty array, and Tags is an
optional field on the New Thread form. Any thread posted with no tags
has `tags: []`, so viewing it crashed every time. `search-postings.ts`
elsewhere in this codebase already guards the same operator with a
`.length > 0` check before calling it; `get-thread.ts` just didn't.
The existing test suite never caught this because its one "no tags"
test thread was always the *related* thread being searched for, never
the primary thread whose own tags feed into `arrayOverlaps`.

Fixed by falling back to a category-only match when the thread has no
tags. Added a regression test (a thread posted with `tags: []` as the
one being viewed) — confirmed it fails with the old code and passes
with the fix. Full suite green (403 unit, 71 e2e), `npm run build`
confirmed twice.

Separately, the same incognito-Firefox modal report turned out to
already be resolved: a cold, logged-out visit to `/forum` in real
Firefox renders zero `<dialog>` elements at all (the New Thread modal
isn't in the DOM for logged-out visitors), consistent with the
dialog-visibility fix above.

## Admin Dashboard implemented (2026-07-14)

The first of the admin-CMS features (15-21, 24-25 in `docs/feature-
list.md`) — `/admin`'s main content area only, per spec.md's explicit
scope; the admin sidebar shell remains Design System infrastructure,
not yet built. All 24 tasks complete: five real-count KPI cards (total
users, active today, new signups, live postings, open reports), a
7-day activity chart with a Signups/Active/Postings metric switcher,
Needs-attention (three `reports`-table queues grouped by `targetType`),
a recent-activity feed backed by a new `auditEntries` table, and Top
games (open-postings-by-game, reusing Home's/Browse's existing
Trending query directly rather than a fourth copy of the same
aggregate).

New `src/lib/admin/activity-data.ts` centralizes both "active today"'s
distinct-user union (postings/applications/forumThreads/forumReplies/
messages) and local-calendar-day bucketing, shared by the KPI and
chart queries so the exact same five-table source list can't drift
between the two. Day-bucketing is done in JS against each row's own
`createdAt` (matching `filter-notifications.ts`'s existing "today"
convention) rather than a SQL `date_trunc`/`GROUP BY`, avoiding any
mismatch between the database's timezone and this convention.

`requireRole("moderator")` gates the whole route — its second real
consumer after Content Page (014) — and since no `role` column exists
yet (Admin Settings/024 adds it), every real session is honestly
forbidden today, exactly like Content Page's own US2/US3. The KPI/
chart/needs-attention/activity content can't be exercised through a
real browser session as a result; every `lib/admin/*.ts` query is
instead unit-tested directly (with before/after-delta assertions for
KPIs touching shared global tables — `users`/`postings`/`reports` — to
stay correct regardless of whatever other data already exists), and
`e2e/admin-dashboard.spec.ts` covers the real, current behavior: an
unauthenticated visitor and a logged-in non-moderator are both denied,
never shown dashboard content.

Visually verified against real seeded data via a throwaway local QA
pass (temporarily bypassing the role gate, screenshotting both the
default and "Active" metric views, then fully reverting the bypass and
deleting all seed data before commit) — KPIs, the chart's real dynamic
weekday labels, Needs-attention counts, Top games ranking/bar widths,
and the recent-activity feed all matched the seeded data exactly.

Full suite green (413 unit, 73 e2e), `npm run build` confirmed twice.

## Admin Users implemented (2026-07-14)

`/admin/users`'s main content area, all 27 tasks complete: stats
(total/active/flagged/banned), a real server-side searchable/
filterable table with computed "flagged" status (an unbanned user with
an open `user`-targeted report — never a stored value, same "compute,
don't duplicate" precedent as Admin Dashboard's own reuse of `reports`
and Error Pages' computed "HOT" badge), Ban/Unban (the single severe
account action — no separate Delete, directly reapplying Profile's
already-made Deactivate-vs-Delete resolution), and a per-user detail
drawer (native `<dialog>`, real focus trap/Escape-to-close, real ARIA
tab semantics for Postings/Forum-posts) with a real, effect-having
Remove action.

New `search-admin-users.ts` computes "flagged"/counts via three small
aggregate subqueries LEFT JOINed against `users` and a single SQL CASE
expression aliased as `status` — both the stats query and the search-
able row list select from that same aliased subquery, so status can
never drift between the two. Caught and fixed a genuine bug immediately
via its own unit test: all three subqueries originally aliased their
count column as `"count"`, which Postgres correctly rejected as
ambiguous once combined in the outer stats query (`column reference
"count" is ambiguous`) — fixed by giving each a distinct name
(`reportCount`/`postingCount`/`threadCount`).

Extends `user` with `bannedAt` and `postings`/`forumThreads` with
`removedAt`. Bounded amendments (research.md's own explicit, narrow
scope) to exactly three already-merged functions — Home's
`get-open-postings.ts`, Browse's `search-postings.ts`
(`buildFilterConditions`, shared with `get-facet-counts.ts` for free),
and Forum index's `search-threads.ts` — now exclude `removedAt`-set
rows; each got a new regression test confirming exclusion, and the
drawer's own `get-user-detail.ts` excludes removed items from its
Postings/Forum-posts tabs too (spec.md's own acceptance criteria: a
removed item "no longer appears in the drawer," not shown with a
removed badge as the wireframe's mock data depicted).

`requireRole("moderator")` gates the whole route AND both new Server
Actions independently (never trusting the page alone) — the third real
consumer after Content Page (014) and Admin Dashboard (015) — so, same
as those two, the real table/ban/drawer content can't be exercised by a
real session yet (no `role` column until Admin Settings/024). Every
query and action is unit/integration-tested directly instead — KPI-
style stats tests use before/after deltas against the shared global
`user`/`postings`/`reports` tables (this feature's own pattern, first
established for Admin Dashboard) so they stay correct regardless of
whatever else already exists — and `e2e/admin-users.spec.ts` covers the
real, current access-denial behavior for both an unauthenticated
visitor and a logged-in non-moderator.

**Found and fixed a real bug during the visual QA pass** (not caught by
the automated suite, since it can't exercise a real session yet):
`toggle-user-ban.ts` and `remove-user-content.ts` both called
`revalidatePath("/admin/users")` without the `"layout"` type argument —
the exact same stale-UI-after-Server-Action class of bug this project
already hit and fixed once for Inbox/messaging (011). Caught by
temporarily bypassing the role gate in both `page.tsx` and the two
Server Actions locally (fully reverted before commit), seeding real
data, and clicking through the actual Ban/Unban/Remove flows in a
browser — confirmed the inline Ban-confirm's focus management works
correctly (focus moves to "Yes" when the confirm appears, back to the
row's own Ban button on Cancel) and that a removed posting is correctly
excluded from Browse (confirmed via Browse's own "No parties match"
empty state, after an earlier false alarm from a naive text-grep that
was actually matching the search input's own echoed value, not a real
result card).

Full suite green (435 unit, 75 e2e), `npm run build` confirmed twice.

## Admin Postings implemented (2026-07-14)

`/admin/postings`'s main content area, all 31 tasks complete: stats (in
queue/user-reported/auto-flagged/removed today), a queue combining
reported and auto-flagged postings under one queue-membership formula
(`removedAt IS NULL AND (hasOpenReport OR unreviewed autoFlagReason)`),
a computed-not-stored severity band (worst of every open report's
reason-implied severity and the posting's auto-flag reason's own fixed
severity — never a stored column, this project's established
compute-don't-duplicate precedent), URL-driven filter chips (spec.md's
own edge case: a posting with both an open report and an auto-flag
reason counts as "User-reported" only, never double-filed), and a
per-posting review drawer (full posting, "why it's here," author card
with prior-warnings/total-posts) with Approve/Remove/Warn/Ban.

New deterministic, non-learned auto-flag ruleset
(`src/lib/postings/auto-flag.ts` — fixed scam/boosting regex lists plus
a new-account-first-post age/first-posting check) wired into Post a
Game's (005) `create-posting.ts` at creation time. New `warnings` table
(this feature's only writer — "first feature that needs a shared entity
defines its minimal shape," the same pattern already used for
Notification/AuditEntry) and `postings.autoFlagReason`/
`moderationReviewedAt` columns.

Ban delegates to Admin Users' (016) existing `toggleUserBan` directly
(careful never to accidentally un-ban an already-banned author, since
that action is a true toggle) then removes the posting under review via
the same path Remove uses — banning someone without also removing the
content that justified it would leave that content still live.
`resolvePostingReport`/`banPostingAuthor` are this feature's — and the
whole project's — first real callers of `logAuditEntry()` (015), also
retroactively wiring Admin Users' own previously-unwired
`toggleUserBan`/`removeUserContent` to it (closing a gap Admin
Dashboard's own spec always anticipated). Also retroactively fixed a
real over-count bug: Admin Dashboard's `get-dashboard-kpis.ts` and
Home's/Browse's shared `get-trending.ts` were both missing the same
`removedAt IS NULL` exclusion Admin Users' own amendments already added
to three other queries — a removed-but-still-`open` posting was
inflating "Live postings" and could still appear in Trending.

`requireRole("moderator")` gates the route AND both new Server Actions
independently — the fourth real consumer after Content Page (014),
Admin Dashboard (015), and Admin Users (016) — so, same as those three,
the real queue/drawer/resolution content can't be exercised by a real
session yet (no `role` column until Admin Settings/024). Every query
and action is unit/integration-tested directly instead, and
`e2e/admin-postings.spec.ts` covers the real, current access-denial
behavior for both an unauthenticated visitor and a logged-in
non-moderator.

**Visual QA pass found no new bugs** (a first for this project's admin
features — Admin Dashboard and Admin Users' own QA passes each caught a
real one): bypassed the role gate locally in `page.tsx` and all three
gated Server Actions (`resolvePostingReport`, `banPostingAuthor`, and
transitively `toggleUserBan` — `banPostingAuthor` re-triggers that
action's own independent gate too, so all three needed bypassing, fully
reverted before commit), seeded postings covering every severity/
queue-membership/banner combination, and exercised all four resolution
actions end-to-end in a real browser. Confirmed via direct DB checks:
reports resolve to `resolved` on every path, `warnings`/`auditEntries`
rows land with the correct data, a removed posting disappears from
Browse while an untouched control posting still shows, and Ban both
sets the author's `bannedAt` and removes the posting under review. (One
false alarm during testing: the review drawer legitimately stays open
after an in-drawer action, same as Admin Users' own drawer precedent —
a naive "is this title still visible" check matched the drawer's own
stale header text, not a lingering queue card.)

Full suite green (474 unit, 77 e2e), `npm run build` confirmed twice.

## Admin Forum implemented (2026-07-15)

`/admin/forum`'s main content area, all 41 tasks complete — the second
moderation-queue feature, most of its infrastructure reused/extended
from Admin Postings (017) rather than reinvented. Stats (in queue/
user-reported/auto-flagged/actioned today — the last a live read of
`auditEntries`, this project's first product-facing use of that table
for a stat rather than just Admin Dashboard's own activity feed), a
queue spanning threads AND replies under the same queue-membership
formula 017 established, filterable All/Threads/Replies/Auto-flagged,
and a review drawer showing the flagged content in context (a reply's
immediately-preceding message dimmed above it, falling back to the
thread's own OP when the reply is the thread's first) with
Approve/Remove/Lock (threads only)/Warn/Ban.

Extracted two shared helpers out of 017's own inline copies:
`src/lib/moderation/reason-severity.ts` and `auto-flag-rules.ts` — the
exact "generalize once a second real consumer exists" trigger 017's own
research.md anticipated. Also generalized 017's posting-specific
`warnings.postingId` column to a polymorphic `targetType`/`targetId`
pair (the "generalize if a third distinct source appears" trigger 017's
research.md separately named) — done as two sequential, unambiguous
schema pushes (add the new columns, backfill, then drop the old one)
rather than one combined change, since `drizzle-kit generate` prompts
interactively when it can't tell an add+drop apart from a rename, and
this shell has no TTY to answer that prompt. "Prior warnings" now
correctly combines across postings/threads/replies in one count,
verified cross-feature during QA (a warning seeded against
`targetType='posting'` correctly counted toward a forum-reply author's
own prior-warnings total).

Reuses Forum Thread's (010) existing `reports` usage (`targetType=
'forum'`, classified against `forumThreads` then `forumReplies` since
that table never added a discriminator column) and Admin Users' (016)
`toggleUserBan`/`forumThreads.removedAt` directly. Adds a new
`forumReplies.removedAt` (016 never extended that table) and
`autoFlagReason`/`moderationReviewedAt` on both tables. "Lock thread"
reuses `forumThreads`' existing `locked` boolean instead of adding a
redundant `lockedAt` timestamp — this feature's own data-model.md had
sketched a new timestamp column before checking that Forum index's
(009) own schema comment had already reserved the existing boolean
specifically for "the future Admin Forum feature," and nothing needs to
know *when* a thread was locked, only whether it is.

Small bounded amendments wire the shared auto-flag ruleset into Forum
index's `create-thread.ts` and Forum Thread's `post-reply.ts` (which
also now rejects replying to a locked thread, re-verified server-side
per Principle II) and exclude removed replies from `get-thread.ts`'s
reply list.

`requireRole("moderator")` gates the route and all three new/reused
Server Actions independently — its fifth real consumer after Content
Page (014), Admin Dashboard (015), Admin Users (016), and Admin
Postings (017) — so the real queue/drawer/resolution content can't be
exercised by a real session yet (no `role` column until Admin
Settings/024); every query/action is unit/integration-tested directly
(504 unit tests total after this feature), and `e2e/admin-forum.spec.ts`
covers the real, current access-denial behavior.

**Visual QA pass found no new bugs** (matching Admin Postings' own
clean pass, unlike Admin Dashboard's and Admin Users' each catching
one): bypassed the role gate locally in `page.tsx`, `resolve-forum-
report.ts`, `ban-forum-author.ts`, and (transitively, since
`banForumAuthor` calls it) `toggle-user-ban.ts`; seeded threads/replies
covering every severity/queue-membership/context combination; and
exercised all five resolution actions end-to-end in a real browser.
Confirmed via direct DB checks and the real Forum index/Forum Thread
pages: reports resolve, `warnings`/`auditEntries` rows land correctly
with the generalized shape, a removed thread disappears from Forum
index while a removed reply disappears from just its own thread's reply
list (an untouched sibling reply still shows), Ban both bans the
account and removes the content under review, and — most notably — a
locked thread's real reply form still renders (matching the "don't hide
the control, reject server-side" principle) but a genuine submission
attempt is rejected with a visible error, confirmed by actually
submitting the form as a regular user rather than only asserting the
`locked` column value.

Full suite green (504 unit, 79 e2e), `npm run build` confirmed twice.

## Admin Reports implemented (2026-07-15)

`/admin/reports`'s main content area, all 37 tasks complete — the
third moderation-queue feature, sitting above Admin Postings (017) and
Admin Forum (018) as their unified triage aggregator. Stats (open
reports/high priority/resolved today/avg response — the last two the
first live read of a new `reports.resolvedAt`), a queue grouped by
reported TARGET (`targetType`+`targetId`) rather than one row per
report — a deliberate breadth-over-depth simplification versus 017's/
018's own per-report drawers, since this feature's whole point is
triage-at-a-glance across four different content kinds. Filterable
All/Postings/Forum/Profiles/Messages, and a review drawer (one
representative reporter's note + "+N others reported this," the
reported content in context, a working "Open in [module] moderation
→" cross-link to 017's/018's/016's own dedicated queues where one
exists — never for messages, which have none) with Dismiss/Remove/
Warn/Ban.

For postings and forum targets, Remove/Warn/Ban all DELEGATE to 017's/
018's existing resolution actions (via a new shared
`classify-forum-target.ts` for the thread-vs-reply split, since a bare
`targetType='forum'` report row doesn't say which table it belongs
to) rather than reimplementing — guaranteeing a posting/thread/reply
acted on from this feature behaves identically to acting from its own
dedicated queue. Dismiss is a new, generic, any-target-type action
this feature introduces (resolves every open report on a target
without touching content or `moderationReviewedAt` — distinct from
Approve, which neither 017 nor 018 has an equivalent to).

Profiles and messages have no prior dedicated queue, so this feature
is their first real mover: a new `messages.removedAt` (with a bounded
amendment to Inbox's 011 conversation-view query excluding it) and
Warn/Ban write directly to the generalized `warnings` table with
`targetType='message'` or `null` (a profile report carries no separate
content id beyond the account itself — "Remove content" is never
offered for one, same ADR-0005-consistent Ban-only precedent as Admin
Users/016). "Total reports" (the drawer's owner card) is a computed,
all-time, cross-source aggregate — direct profile reports plus every
report against any posting/thread/reply/message the user authored —
never a maintained counter, computed via parallel COUNT queries rather
than one nested SQL subquery (matching this codebase's established
style).

Two small, bounded, single-place retroactive fixes ripple to every
moderation feature at once: 017's and 018's resolve actions now also
set `reports.resolvedAt` alongside `status` (one extra field in an
already-existing UPDATE, no logic change), and the shared
`reason-severity.ts`'s `impersonation` mapping corrected from medium
to high — this feature's own wireframe seed data treats a
phishing-adjacent impersonation case as a real security risk, not a
routine one. Both changes are immediately visible on 017's/018's own
queues too, without touching either feature's files beyond that one
line — exactly the payoff of having extracted the helper in the first
place. `classify-forum-target.ts` was planned as an extraction from
018's own inline thread-vs-reply classification (per its own
research.md), but on inspection 018's `get-forum-queue.ts` never
actually had one written as a standalone function — it sidesteps the
need entirely by scanning threads and replies as two independent
queries. Built fresh instead, used for real by `resolve-report-action.ts`
and `ban-reported-user.ts`; the planned "refactor 018 to use it" task
was a no-op given the code as it actually exists, not a deviation
worth forcing.

`requireRole("moderator")` gates the route and all three new Server
Actions (dismiss/resolve/ban) independently — its seventh real
consumer after Content Page (014), Admin Dashboard (015), Admin Users
(016), Admin Postings (017), and Admin Forum (018) — so the real
queue/drawer/resolution content can't be exercised by a real session
yet (no `role` column until Admin Settings/024); every query/action is
unit/integration-tested directly (534 unit tests total after this
feature), and `e2e/admin-reports.spec.ts` covers the real, current
access-denial behavior.

**Visual QA pass found no product bugs** (matching Admin Postings' and
Admin Forum's own clean passes): bypassed the role gate locally in
`page.tsx`, `dismiss-report.ts`, `resolve-report-action.ts`,
`ban-reported-user.ts`, and — since the cross-link navigates for real
into them — Admin Forum's/Admin Postings'/Admin Users' own page gates
too, plus the full transitive chain into `resolve-posting-report.ts`/
`resolve-forum-report.ts`/`toggle-user-ban.ts`. Seeded reports across
all four target types (including a multi-reported thread) and
exercised grouping, the corrected severity mapping, filtering, the
drawer's cross-link (clicked through to Admin Forum's own queue and
confirmed the same content), and Dismiss/Remove/Warn/Ban end-to-end in
a real browser. Two QA-script-only false alarms, not product bugs: a
posting/thread's own title is deliberately never rendered on its queue
card (matching Admin Forum's own established precedent), so the
script's own locators needed to key off owner handles/snippets
instead; and reusing one seed user as both a card's owner and a second
report's reporter produced an ambiguous text-match, not a real
duplicate-rendering bug. Confirmed via direct DB checks and the real
Inbox page: removing a posting/message sets its `removedAt` and drops
it from the queue, a removed message disappears from its real Inbox
conversation while an untouched sibling message still shows, warning a
profile writes a `null`-targeted `warnings` row, and banning from a
message report both bans the account and removes that message.

Full suite green (534 unit, 81 e2e), `npm run build` confirmed twice.

## Admin News implemented (2026-07-15)

`/admin/news`'s two-pane CMS, all 26 tasks complete — News feed's
(013) first real `NewsPost` writer. A filterable (All/Published/
Drafts/Scheduled) post list (cover thumb, status badge, date, pin
indicator, "+ New") alongside an editor (cover color swatches, title,
category chips, excerpt, a markdown-snippet-assisted body textarea,
publish settings) with a live preview reflecting every field change
before saving — matching Post a Game's (005) own established local-
state-plus-live-preview pattern, not a server round-trip per
keystroke. Selection lives in the URL's `?postId=` param (every other
admin drawer/editor's own convention); `key={post?.id ?? "new"}` on
the editor remounts it (resetting local form state) whenever a
different post is selected or "+ New" is clicked.

Adds `newsPosts.body` (plain markdown text, not a rich document —
research.md #4 explicitly rejected a WYSIWYG editor or a Content-
Page-style JSONB block structure as disproportionate for a single
scrolling announcement) and `newsPosts.status` (`draft`\|`published`\|
`scheduled`, defaulting to `draft`). One `save-news-post.ts` Server
Action handles every one of the wireframe's five footer actions
(Publish now/Update/Schedule/Save draft/Delete) via a discriminated
`action` field rather than five near-identical actions: `publish`
only sets `publishedAt = now()` when the row's current status isn't
already `published` (an edit to an already-live post via "Update"
never re-dates it and doesn't jump the public feed's ordering);
`save-draft` always overrides to `draft` regardless of what the
editor's status segmented control currently shows (FR-007's explicit
override); `delete` is the ADR-0005-safe "Unpublish" (`status →
draft`, the row itself never removed, still editable from the
Drafts filter). Reuses News feed's own `featured` column for "pin,"
finally implementing the at-most-one-featured invariant that
feature's own data-model.md had explicitly deferred to "the future
Admin News feature" — enforced in the same transaction as every save
(not its own separate action), since the wireframe's own pin toggle
only mutates local draft state until the next footer-button click.

Small, bounded amendment to News feed's (013) `search-news.ts`: a
post is only actually live when `status = 'published'`, or `status =
'scheduled'` with a `publishedAt` that has already passed — computed
at read time by both the main grid query AND the featured-post pick
(a draft or not-yet-due scheduled post can be pinned locally without
ever leaking onto the real public feed), no cron/background job
involved, matching this project's repeated preference (posting
auto-expiry/ADR 0003, Admin Reports' own resolvedAt-driven stats).
Every pre-existing `newsPosts` row (this feature's own DB default is
`draft`) needed an explicit `status: "published"` to stay visible:
`scripts/seed-news-posts.ts` (dev convenience) and `e2e/news-feed.spec.ts`
(real e2e seed data) both updated accordingly, confirmed via a full
e2e run rather than assumed.

`requireRole("moderator")` gates the route and the one Server Action
independently — its eighth real consumer after Content Page (014),
Admin Dashboard (015), Admin Users (016), Admin Postings (017), Admin
Forum (018), and Admin Reports (019) — so the real list/editor content
can't be exercised by a real session yet (no `role` column until Admin
Settings/024); every query/action is unit/integration-tested directly
(553 unit tests total after this feature), and `e2e/admin-news.spec.ts`
covers the real, current access-denial behavior.

**Visual QA pass found no product bugs** (fourth consecutive clean
pass): bypassed the role gate locally in `page.tsx` and
`save-news-post.ts` (the smallest bypass list yet — this feature
doesn't delegate into any other feature's gated action or page, unlike
every prior moderation-queue feature). Exercised create+publish (live
preview updating per keystroke, confirmed live on the real `/news`
page), edit-and-Update (confirmed `publishedAt` unchanged), schedule-a-
future-post (confirmed absent from `/news`), Save-draft-overrides-the-
status-control, pin-exclusivity (pinning a second post unpinned the
first), and delete-as-unpublish (confirmed gone from `/news`, still
present and editable under the admin list's own Drafts filter) --- all
end-to-end in a real browser. Every QA-script failure along the way
was a locator ambiguity from a real, harmless UI coincidence rather
than a defect: "Update" is simultaneously a `NEWS_CATEGORIES` chip
label and the primary button's own label when editing an
already-published post; "Scheduled"/"Published" are simultaneously
list filter-chip labels and the editor's own status-segmented-control
labels — a human glancing at the two-pane layout never confuses them
(different regions, different styling), only a naive accessible-name
locator does.

Full suite green (553 unit, 83 e2e), `npm run build` confirmed twice.

## Admin Content Pages implemented (2026-07-14)

`/admin/content-pages`, all 25 tasks complete — a thin management list
wrapping Content Page's (014) already-existing `ContentPage` table.
Stats (total/published/drafts/system), a fetch-all-then-filter search
(title/slug) + status/system filter chips (research.md #5's own
small-bounded-list precedent, matching Admin News/020, not Admin
Users'/Browse's SQL-paginated pattern — the number of static pages a
site has is inherently small), and a row per page (icon, title, 🔒
System badge, URL, status badge, updated date, actions). URL-driven
search/filter state, this project's now-standard convention across
every admin table.

Publish/Unpublish call 014's existing `toggle-page-status.ts` directly
— no second status-toggle implementation. View and Edit both navigate
to the page's own public slug (`/pages/[slug]`), where 014's existing
inline-edit affordance (its own "✎ Edit page" toggle, gated by the
same role check) already lives — this feature builds no second
content-editing UI, per its own spec's explicit scope boundary. Delete
(custom pages only, an inline "Delete? Yes/No" confirm with real focus
management — Admin Users' own established pattern, Yes-button
autofocus and No-cancel refocuses the triggering button) is a new,
thin `delete-content-page.ts`: unconditionally sets `status = 'draft'`
(ADR 0005, never a row removal, and never a toggle since Delete must
always land on draft regardless of current status) and rejects
`system = true` targets server-side as defense in depth beyond the
UI's own gate (which never renders a delete affordance for system rows
at all — a 🔒 indicator takes its place). "+ New page"
(`create-content-page.ts`) generates a unique, human-legible slug
(`untitled-page`, `untitled-page-2`, …) by checking 014's existing
unique `slug` constraint and appending an incrementing suffix on
collision.

Adds `contentPages.system` (new boolean column, default `false`) and
this feature's own Foundational-phase data seed
(`scripts/seed-system-pages.ts`, idempotent — skips any slug that
already exists) inserting About Us, Privacy Policy, and Terms of Use
as real, published, `system = true` rows. No prior feature ever wrote
a `ContentPage` row, so without this seed a fresh deployment would
launch with zero legal/structural pages — unacceptable for a real
site, not an admin's first manual to-do item.

**Found and fixed a real data-model.md inconsistency before it
shipped**: the spec's own Seed data table listed the three system
pages' slugs with a leading slash (`/about`, `/privacy`, `/terms`),
mirroring the wireframe's cosmetic `playm8z.com{{p.slug}}` display —
but 014's real `contentPages.slug` convention (its own seed script's
`community-guidelines`, its e2e spec's bare slugs, `toggle-page-status.ts`'s
own `revalidatePath` call) stores bare slugs matched directly against
the `/pages/[slug]` dynamic route segment; a stored leading slash could
never actually route (Next.js dynamic segments don't accept a literal
`/`). Corrected to bare slugs (`about`/`privacy`/`terms`) in both the
seed script and `create-content-page.ts`'s own `untitled-page` slug
generator, with the leading slash added back only for cosmetic display
in the admin table's URL column — caught by checking 014's actual
runtime convention before trusting the spec artifact's literal values,
the same "verify the code before trusting the doc" discipline this
project has hit before with research.md claims.

`requireRole("moderator")` gates the route and both new Server Actions
independently — its ninth real consumer after Content Page (014),
Admin Dashboard (015), Admin Users (016), Admin Postings (017), Admin
Forum (018), Admin Reports (019), and Admin News (020) — so the real
list/action content can't be exercised by a real session yet (no
`role` column until Admin Settings/024); every query/action is
unit/integration-tested directly (566 unit tests total after this
feature), and `e2e/admin-content-pages.spec.ts` covers the real,
current access-denial behavior.

**Visual QA pass found no product bugs** (fifth consecutive clean
pass): bypassed the role gate locally across this feature's own
page/two Server Actions, plus 014's reused `toggle-page-status.ts` and
`save-content-page.ts`, plus 014's own `/pages/[slug]` page (the
Edit/View cross-link target) — six files total, fully reverted before
commit. Exercised stats accuracy, search by title and by slug
fragment, all four filter chips, the no-match empty state,
Publish/Unpublish (status badge and stats updating immediately),
page creation (unique slug confirmed, "Edit" landing on 014's real
inline-edit surface after its own "✎ Edit page" toggle), and both
delete-confirm paths (No cancels back to normal row actions, Yes sets
`status = draft` while the row stays in this feature's own list) —
all end-to-end in a real browser, plus a zero-violation axe-core scan
against the live, authenticated table (the real e2e suite's own axe
scan only covers the 401 access-denied page, since the role gate
blocks the real content from ever rendering in CI).

Full suite green (566 unit, 85 e2e), `npm run build` confirmed twice.

## Public profile page implemented (2026-07-14)

The public `/u/:handle` page, all 28 tasks complete — no login required
to view. Identity/bio, real (non-decorative) stats — a rating+review-
count pair and a computed `sessions` proxy (accepted applications as
applicant + closed/full hosted postings, no new tracking) — the games
this user actually plays, their currently-open hosted postings with an
inline "Request" (reusing 006's `applyToPosting` directly, no message
step — a lighter entry point than Listing detail's own full apply
form), display-only Player reviews (new `reviews` table, no writer yet
— rating submission stays deferred platform-wide, `docs/future-work.md`,
the same "ship the entity/display now, adopt the writer later" pattern
as `Notification`/`AuditEntry`), a public-info sidebar (region/age
group/platforms), and — authenticated, non-self viewers only — a "You
have in common" sidebar (mutual follows + shared games, both computed
at read time, never stored). Drops six wireframe elements (online
presence, reliability %, groups, per-game rank/hours, level, pronouns/
languages/timezone) against already-established precedent from five-
plus prior features.

New Follow (`toggle-follow.ts`, a new `follows` table, hard-deleted on
unfollow — no trust/safety history value, the same exception already
applied to `SavedListing`/`Likes`/`ThreadSubscription`, not `Blocks`'
own soft-preserved pattern) and a host-initiated "Invite to a party"
(`invite-to-party.ts`) that reuses 006's existing `applications` table
via a new `initiatedBy` (`applicant`\|`host`) column rather than a
parallel invite system — an invite still needs the INVITED person's
own consent, so it resolves through the exact same accept/decline
transaction (seat decrement, posting-fill, conversation creation) a
normal applicant-initiated request does, guaranteeing identical
behavior regardless of entry point. This required small, bounded
authorization reversals across four of Inbox's (011) already-merged
files: `accept-request.ts`/`decline-request.ts` (the invited applicant,
not the inviting host, is authorized to decide a host-initiated row),
`get-inbox-list.ts` (surfaces the pending invite in the invited
applicant's own inbox instead of the host's), and `get-conversation.ts`
(same authorization reversal for viewing the request detail page) —
with `request-banner.tsx`/`conversation-list.tsx`/the inbox detail
page's own display text branching to say "@host invited you to their
party" instead of "@applicant wants to join your party" for that
direction.

**Found and fixed a real, previously-latent bug while wiring this up**:
`conversation-list.tsx`'s inbox row preview text was hardcoded to a
generic "Wants to join your party" for EVERY request-kind item,
regardless of `item.preview`'s real value — silently discarding an
applicant's own actual application message on every pending-request
row in the inbox LIST view, not just this feature's new invite items
(the message itself was still shown correctly on the request's own
detail page, so this bug was invisible unless you compared the list
row against the detail page side by side). Fixed by rendering
`item.preview` directly — `get-inbox-list.ts` already computed the
correct value for both directions (`request.message?.trim() ||
"Wants to join your party."` for a normal request, "Invited you to
join their party." for an invite) — the bug was purely in the display
layer ignoring it. `e2e/inbox.spec.ts`'s own pre-existing assertion
(which had been silently relying on the bug — asserting the generic
hardcoded string rather than the seeded applicant's real message) was
corrected to match the now-genuinely-correct behavior.

**Also corrected a data-model.md field claim before it shipped**: the
spec named `users.gamesPlayed` (onboarding's flat array, set once at
signup) as this feature's games source, but that field is never
updated afterward by any later feature — Profile's (007) own
`userGames` table (kept current via `addUserGame`/`removeUserGame`) is
the real, currently-maintained "games this user plays" list.
`get-public-profile.ts` and `get-in-common.ts` both read from
`userGames` instead, confirmed via a dedicated integration-test
assertion that a stale `gamesPlayed` entry never leaks through while a
real `userGames` entry does.

Unlike every admin/moderation feature this session, this feature has
**no `requireRole`-style hardcoded gate** — `requireVerifiedEmail`/
`requireAuth` check real session state (a real `emailVerified` column,
not a hardcoded rank) — so it needed no local bypass at all for
verification. `e2e/public-profile.spec.ts` exercises all three user
stories fully through real, independently-verified Playwright sessions:
the public view (logged out) with a zero-violation axe-core scan and
confirmation that none of the six dropped elements ever appear;
Follow/Unfollow; Message; Invite end-to-end across two real sessions
(the inviting viewer, then a session-switch to the invited profile
owner accepting from their own real Inbox, confirmed via direct DB
checks that the application accepts and the posting's seat count
decrements); the no-eligible-posting disabled state; the "You have in
common" sidebar's accuracy (and its absence for both a self-view and a
genuinely separate logged-out browser context, Listing detail's own
established anti-flake pattern); Report/Block opening the canonical
`012`/`008` flows; and unauthenticated/unverified gating. Two of the
e2e failures hit along the way were real QA-script issues, not product
bugs, worth remembering: (1) a Playwright `waitForURL()` regex matching
a generic UUID path pattern resolves immediately if the CURRENT url
already satisfies it — after clicking "Accept" from `/inbox/
{applicationId}` (itself already UUID-shaped), the wait needs to
target navigation AWAY from that specific id, not just "any /inbox/
UUID url," or DB assertions race ahead of the action actually
completing; (2) once both the fixed inbox-list preview AND the
request-detail message bubble correctly show the same real applicant
message, a bare text locator matches both — needs disambiguating
(`.last()`, or a more specific role-scoped locator) once, not a defect.

Full suite green (590 unit, 95 e2e), `npm run build` confirmed twice.

## News article detail implemented (2026-07-15)

The public `/news/:slug` article page, all 28 tasks complete — no
login required to view. Category/date/computed-read-time meta, title,
a fixed "playm8z team" byline (the wireframe's own — no per-article
author tracking exists anywhere in this project, matching Admin News'
own editor preview which already showed the identical fixed byline),
a cover block, the full markdown body rendered via a new dependency
(`marked`), tags, a "Keep reading" grid (up to 3 other currently-live
articles, reusing News feed's, 013, own live-check query verbatim —
exported `isLiveCondition()` from `search-news.ts` rather than a
second copy that could drift), a pure client-side `aria-hidden`
reading-progress bar, and the reused newsletter-subscribe box. Read
time is computed from the body's word count at render time (floored
at 1 minute) — 013's own `readTimeMinutes` column stays unused dead
weight, exactly as its own research anticipated.

Like reuses Forum Thread's (010) already-polymorphic `likes` table as
its third `targetType` (`newsPost`) — no schema change needed, just a
new consumer of a shape already built for this. Save gets its own
small, separate `savedNewsPosts` table, deliberately NOT a premature
generalization of `savedListings` (007) — this is only the second real
consumer, below this project's own "generalize when a THIRD consumer
appears" bar (the same bar `warnings`' own polymorphic generalization
was measured against). Surfaced in Profile's Saved tab as a new
"Saved articles" section alongside the existing saved-postings grid —
without this, "Save" would be a write with no visible effect.

Adds `newsPosts.slug` (unique, generated once at creation only by a
bounded amendment to Admin News' (020) `save-news-post.ts`, using the
exact numeric-suffix collision approach Admin Content Pages' (021)
`create-content-page.ts` already established — immutable afterward, so
editing a title later never breaks a shared/bookmarked article URL)
and bounded amendments to News feed's (013) own `NewsPostCard`/
`FeaturedPost` components, both now real `<Link>`s to their article.

**Found and fixed two real gaps beyond this feature's own explicit
scope, both worth remembering**:

1. **`newsPosts` had no `tags` column or editor field anywhere**,
   despite this feature's own spec.md FR-001 requiring tags to render
   on the article page — a genuine spec gap (data-model.md never
   defined where tags would live), not a deliberate deferral like
   `readTimeMinutes`'s own documented one. Unlike read time, tags have
   no way to be computed from any existing data, so the correct fix
   was a real stored column plus a way to set it — added
   `newsPosts.tags` (text array) and a plain comma-separated tags input
   to Admin News' (020) editor, matching Forum index's own established
   tags-input pattern (`toStringArray` preprocessing) exactly rather
   than inventing a new UI convention.
2. **`conversation-list.tsx` (Inbox, 011) had ANOTHER hardcoded fallback
   string** discarding real per-item data in the inbox list view — this
   one was caught organically while building this feature's own Like/
   Save error-display (a Playwright locator match against text that
   should have been the real error message revealed the pattern was
   suspicious), inspected the component, and found `item.preview` was
   being computed correctly by `get-inbox-list.ts` but silently ignored
   by the rendering component for a SEPARATE, unrelated reason (not
   news-related at all) — fixed by rendering `item.preview` directly.
3. **A real hydration-mismatch bug in the share buttons**: X/LinkedIn
   share-intent URLs were built from `window.location.href` read
   directly during render — undefined during SSR (empty href), then
   "corrected" after client hydration, producing a genuine React
   hydration-mismatch warning and a real broken-link flash for anyone
   clicking before hydration completed. Fixed by moving the
   `window.location`/`document.title` reads out of render entirely and
   into `onClick` handlers using `window.open()`, matching this
   project's own established "only touch `window` inside an event
   handler" pattern already used by every prior Share/copy-link
   control (Public Profile's own `handleShare`, Listing detail's own
   `handleShare`) — this feature's own X/LinkedIn buttons were the
   first to try rendering a `window`-derived value directly into
   markup instead.

Unlike every admin/moderation feature this session, and like Public
Profile immediately before it, this feature has **no `requireRole`-
style hardcoded gate** — `requireVerifiedEmail`/`requireAuth` check
real session state — so it needed no local bypass at all.
`e2e/news-article-detail.spec.ts` exercises all three user stories
fully through real, independently-verified Playwright sessions: the
public read (logged out) with a zero-violation axe-core scan and a
real, non-zero computed read time; the same not-found response for a
draft/not-yet-due-scheduled/nonexistent slug; the reading-progress bar
actually tracking real scroll position (0% at top, 100% at bottom);
Keep reading's accuracy; Like persisting across a reload and reverting
on unlike; Save appearing in Profile's Saved tab and unsaving from
there; and unauthenticated/unverified gating. The share-buttons test
stubs `window.open` rather than following real popups, since X's own
live (and entirely out of this project's control) redirect-to-login
chain for an unauthenticated browser made asserting on the actual
external navigation genuinely flaky — a QA-tooling choice, not a
product concession.

Full suite green (612 unit, 104 e2e), `npm run build` confirmed twice.

## Admin Settings implemented (2026-07-15)

`/admin/settings`, all 43 tasks complete — gated at `admin`
specifically, stricter than every other `/admin/*` page's `moderator`
minimum. This is the feature `require-role.ts`'s own comment had named
since Content Page (014): it finally adds the real `users.role` column
(`user`\|`support`\|`viewer`\|`moderator`\|`admin`), so `requireRole()`
now queries it fresh per request (never the JWT) rather than the
hardcoded rank-0 every session got before. That makes this the FIRST
admin feature — and retroactively every prior one too — whose gate can
be exercised by a real, non-bypassed session.

A tabbed client shell (`role="tablist"`, plain `useState` section
state, no URL param — this page is never linked to mid-section) over
five sections:

- **General**: site name/tagline/support email/default theme (no
  current reader — nav/footer/theming remain Design System infra) plus
  Error Pages' (002) long-deferred real maintenance-mode toggle, saved
  immediately on click rather than gated behind the section's own Save
  button, given how consequential it is.
- **Moderation & auto-flag**: the admin-editable banned-phrases list
  plus four independent filter toggles (banned-phrase/external-link/
  boosting-keyword/new-account-review) now drive `017`'s/`018`'s
  shared `auto-flag-rules.ts` instead of its own hardcoded constants —
  the built-in regex patterns/thresholds stay fixed, only the extra
  admin-supplied phrases and each check's on/off state are
  configurable, matching the wireframe's own actual scope. A computed
  — never stored — auto-hide-after-N-reports rule was added as a
  SECOND amendment to Home's/Browse's/Forum index's (003/004/009)
  already-once-amended queries (Admin Users, 016, added the first),
  so resolving enough open reports via any of 017/018/019's own
  actions automatically un-hides a row with zero extra code anywhere
  else. A computed "needs ban review" display badge (never an
  automated ban) was added to 017's/018's/019's own queue queries,
  comparing each row's already-computed severity against the
  configured threshold.
- **Roles & access**: a live team list (role dropdown + remove) plus
  "Invite a team member" — deliberately ONE `assignTeamRole` action
  serves both a known member's dropdown AND a by-email lookup for a
  brand-new plain `user` (who has no team-list row yet, since
  `get-team.ts` only lists role >= support) — no separate invite-token/
  pending-invite system, per research.md's own reasoning.
- **Feature flags**: only Open Signups gets real enforcement
  (Credentials sign-up's `register/route.ts`); the other five
  (Discord/Groups/Ratings/Forum/Tabletop) persist but are consulted by
  nothing yet, logged to `docs/future-work.md`.
- **Safety**: Discoverable-profiles-by-default, wired to both sign-up
  paths' account-creation moment (register/route.ts for Credentials, a
  new `events.createUser` in `src/auth.ts` for Google OAuth, since the
  adapter creates that row itself with no app code in between).

Extends Error Pages' (002) singleton `settings` table with all ~19 new
fields exactly as that feature's own data-model.md anticipated
("the future Admin Settings feature owns writing to it and will extend
this same table... rather than this feature inventing a shape that
gets replaced later") — never a second, competing config table. Every
settings-save Server Action across all five sections logs an audit
entry (015), closing the loop 002's own spec said would eventually
happen.

**Found and fixed two real bugs beyond this feature's own explicit
scope, both worth remembering**:

1. **An admin toggling maintenance mode on was NOT actually unaffected
   sitewide** — only `/admin/*` was ever exempt in `proxy.ts`; every
   OTHER route, including the post-login `/continue` redirect and even
   `/login` itself, still showed the maintenance page to an
   authenticated admin, since `proxy.ts` had no concept of role at all
   before this feature (there was no real role to check). Fixed with a
   sitewide admin bypass (`getCurrentRole()` >= admin skips the
   maintenance rewrite for any route), plus a separate `/login`
   exemption — without it, an admin who isn't CURRENTLY logged in (a
   different browser, an expired session) would have no way to reach
   the login form at all during an active maintenance window, since
   that visitor has no session yet for the bypass to apply to. Caught
   by this feature's own e2e suite: a non-admin login flow during
   maintenance genuinely hung on the maintenance page instead of
   reaching Home.
2. **Every settings-save Server Action called `revalidatePath()` (only
   invalidates Next.js's own route cache) but never invalidated
   `get-settings.ts`'s separate, hand-rolled 5-second TTL cache** — so
   an admin saving General/Moderation/Features/Safety settings and
   immediately reloading the page would see stale (pre-save) values
   for up to 5 seconds. Also caught by the e2e suite (a reload
   immediately after Save showed the OLD banned-phrase/toggle state).
   Fixed by renaming the test-only `_resetSettingsCacheForTests` to
   the now-genuinely-production-purposed `invalidateSettingsCache()`
   and calling it from the shared `upsertSettings()` helper every save
   action already used — a single, central fix for all seven actions
   at once.

A small, bounded retroactive fix closes a gap this feature's own
research surfaced while designing the Safety section: Public Profile
(022) never actually honored Profile's (007) existing `showRegion`/
`showAgeGroup` privacy toggles, unconditionally showing Region/Age
group to every visitor regardless of the owner's own preference —
`get-public-profile.ts` now selects both columns and the profile page
conditionally omits each field for a non-owner viewer (the owner's own
view of their own profile is unaffected).

Full unit/integration coverage: validations, `get-team.ts`, and all 7
Server Actions — each proven against a REAL `admin` session succeeding
AND a real `moderator` session being rejected, no mocking of
`requireRole` itself (the first admin feature able to do this, since
the role column is finally real). `e2e/admin-settings.spec.ts` (11
tests) exercises all three user stories through real sessions with
real roles — access control (unauthenticated/moderator/admin), general
settings persistence + audit logging, maintenance mode's real sitewide
effect (admin unaffected, a separate non-admin session blocked,
restores on toggle-off), moderation settings persistence, a role
promotion taking effect on the promoted user's very next request (no
staleness), team removal reverting to plain `user`, invite-by-email
for both an existing and a nonexistent account, Open Signups rejecting
a real sign-up while leaving existing logins unaffected,
Discoverable-by-default initializing a brand-new account correctly,
and the Public Profile privacy fix — plus a zero-violation axe-core
scan. This is the first admin/moderation feature in the whole project
that needed NO local QA bypass of any kind, for its own gate or any
other admin feature's.

Full suite green (673 unit, 115 e2e), `npm run build` confirmed twice.
Schema migration (`0028_admin_settings_schema.sql`) pushed to local dev
DB, verified via direct `information_schema` query before any test ran
against it.

## Moderator audit log implemented (2026-07-15)

`/admin/audit-log`, all 21 tasks complete — gated at `moderator`
(deliberately less strict than Admin Settings' `024` admin-only gate:
this is a read-only transparency tool for the whole moderation team,
not a mutation surface). Its own `require-role.ts` gate needed no
local bypass at all — like Public Profile/News Article detail before
it, the real role column (024) means a genuine seeded
moderator/admin session exercises it end-to-end.

A real, server-side `searchParams`-driven view over Admin Dashboard's
(015) existing `auditEntries` table — its first full, dedicated,
filterable/paginated viewer (the dashboard's own recent-activity feed
only ever showed a short preview). Search matches actor/action/
target/reason; an actor dropdown lists every real actor who has ever
logged an entry plus a "System" sentinel for a null `actorId`; a
category filter narrows to the real, stored 4-value `category`
(`moderation`\|`content`\|`access`\|`system`) — the wireframe's own
richer 11-value badge scheme (Removal/Ban/Warning/...) has no backing
column, so rather than inventing a fragile keyword classifier off
free-text `action` strings, the badge just shows the real value,
capitalized. Entries group into Today/Yesterday/Earlier (one bucket
further back than Notifications' own Today/Earlier, since this log is
expected to be browsed further back than a notification feed).
Cumulative "Load more" pagination (News feed's own precedent) since
the table accumulates indefinitely. Each row is a real, keyboard-
operable disclosure (`aria-expanded`) revealing its `reason` and every
`meta` key/value pair recorded at write time. "Export CSV" is a real
gated GET route handler (`/admin/audit-log/export`) that re-validates
and re-runs the exact same filter, unpaginated — what's on screen is
what downloads, never the full unfiltered table.

Closes a real gap this feature's own design surfaced (the third such
gap found this way this session, after Public Profile's in Admin
Settings): Admin News (020) and Admin Content Pages (021) were the
only two admin features that never wired 015's `logAuditEntry()`
despite its own spec explicitly anticipating "Admin Users/Postings/
Forum/News" (and, by the same CMS-shaped reasoning, Content Pages) as
real callers. Small, bounded amendments: `save-news-post.ts` now logs
a `content`-category entry on a genuine first-time publish, a
schedule, or an edit to an already-published post (never on
save-draft/delete, matching the gap's own stated scope); `create-
content-page.ts`/`toggle-page-status.ts`/`delete-content-page.ts` each
now log one too. Every amended action needed a second change alongside
its new `logAuditEntry()` call: each now also calls `requireAuth()` to
get a real actor id to attribute the entry to, which meant every
existing test file for these four actions needed a `@/auth` mock and a
seeded real user added (previously only `requireRole` was mocked) —
mechanical but necessary across all four.

Full unit/integration coverage: `audit-log.ts`'s Zod schemas (search/
actor/category/page, including a union+`.catch()` for the actor filter
so a tampered non-uuid value degrades to "all" rather than ever
reaching a real `uuid` column comparison), `get-audit-log.ts`'s search/
filter/day-grouping/pagination (a pure `groupByDay()` tested with
synthetic entries, no DB needed, plus a real-Postgres integration
suite scoped via a unique runId embedded in every seeded row's own
text — deliberately NOT a wholesale table wipe, since `auditEntries`
is this project's real, append-only audit trail and wiping it in a
test would erase genuine history), `export-audit-log-csv.ts`'s exact
filter-mirroring and comma/quote escaping, and all four amended `020`/
`021` actions each proven to call `logAuditEntry()` with the right
category/target against a real seeded moderator (no mocking of the
gate itself). `e2e/audit-log.spec.ts` (11 tests, zero-violation axe
scan) covers access control (unauthenticated/non-moderator/moderator,
real sessions), browse/search/day-grouping, combined actor+category
filtering, the empty state, expand/collapse, CSV export mirroring the
active filter, a delta-count proof that browsing never writes a new
entry itself, and both gap-fix scenarios exercised through the real
Admin News/Admin Content Pages UI (publishing a real post, publishing
a real page) — confirmed visible here afterward. One real test-design
bug caught and fixed during this feature's own e2e work: the news post
this suite publishes for its own gap-fix scenario was never being
deleted afterward, and since News Article detail's (023) "Keep
reading" query ranks the 3 most-recently-published posts across the
WHOLE `newsPosts` table with no per-test scoping, the leftover row
intermittently displaced that spec's own expected results in a
full-suite run (passed in isolation, failed combined) — fixed by
tracking and deleting the created post in this spec's own `afterAll`,
the same "clean up after yourself in a shared, unscoped table" rule
already established multiple times elsewhere in this project.

Full suite green (693 unit, 126 e2e), `npm run build` confirmed. No
schema migration — this feature is read-only against `auditEntries`
plus small logic-only amendments to two existing actions.

## Logged-out marketing landing page implemented (2026-07-15) — 26th and final feature

`/` for an unauthenticated visitor now renders this feature's real
marketing content instead of redirecting to `/login` — the exact loop
Home's (003) own spec left open from day one. An authenticated
visitor's experience is completely unchanged (same branch, same
route, just checking `auth()` first).

Every "live-feeling" number is real, computed at render time by a new
`get-landing-stats.ts`:

- **Total players** — `COUNT(*) FROM user`.
- **Games & tables** — `COUNT(DISTINCT postings.game)` across ALL
  postings ever (deliberately a catalog-breadth stat, not a "right
  now" one — the only number on this page that isn't scoped to
  currently-open postings).
- **Parties formed this week** — a new `applications.acceptedAt`
  (nullable timestamp), set by Inbox's (011) existing
  `accept-request.ts` alongside its already-existing `status =
  'accepted'` write. No prior feature ever captured *when* an
  application was accepted, only *that* it was — the same class of gap
  Admin Reports' (019) own `resolvedAt` addition closed for a different
  table.
- **The hero's floating card(s)** — 1-2 real, currently-open postings,
  reusing `listing-card.tsx` directly (not a bespoke hero-only
  component) for the primary card, plus a smaller compact secondary
  card for a second real posting. Zero open postings shows a clearly
  decorative fallback ("No open parties yet — be the first to post
  one"), never styled to look like a real listing.

The wireframe's fake "4,300+ players online now" presence badge and
"4.9★ avg teammate rating" are both dropped entirely — no real
presence-tracking or rating-submission system exists anywhere in this
project (Public Profile's, 022, `Review` entity still has no writer),
the same no-fake-data discipline already applied to Home, Profile,
Forum index, Inbox, Admin Dashboard, and Public Profile. The "Why
playm8z" feature grid's profile card is reworded to "Real player
profiles," describing only what's real today (games played,
region/platform) rather than claiming reliability scores or live
ratings; testimonials are the one deliberate, reasoned exception —
fixed, hand-written marketing copy, since a testimonial section is
universally understood as curated editorial content, not a real-time
data claim. "Browse by genre" shows real per-genre open-posting counts
across Browse's (004) own 8-genre enum, each genre card linking into a
real, working, pre-filtered Browse view (`/browse?genres=X`). The
footer links About/Privacy/Terms to Admin Content Pages' (021) real
seeded system pages; Community Guidelines/Careers/Safety Center point
at plain, not-yet-created slugs — visiting one before an admin creates
it shows Content Page's (014) real not-found behavior, exactly as any
other not-yet-created custom page would.

**Found and fixed one real bug during this feature's own test-writing,
worth remembering broadly**: postgres.js converts a JS `Date` object
differently than Postgres's own `now()`/`defaultNow()` for a
"timestamp without time zone" column — comparing a row stamped via an
explicit JS `new Date(...)` against a sibling row stamped via the
schema's own `defaultNow()` produced a multi-hour skew, silently
reversing an intended "this row is older than that one" ordering in a
test. Fixed by giving BOTH compared rows an explicit JS Date from the
same clock reference, never mixing one explicit value with the
schema's own server-side default when a test's own correctness depends
on their relative order. This doesn't affect any shipped production
code (every real row's own `createdAt`/`acceptedAt` values come from a
single consistent source — either always `defaultNow()` for organic
postings, or always a JS `new Date()` written by one specific action —
never a mix within the same comparison), but it's a real trap for any
FUTURE test that seeds two rows and needs to control their relative
timestamp ordering.

A second, smaller lesson from the same test-writing pass: `getByText()`
substring-matching a short, common word (here, "players") can
silently match multiple unrelated page sections at once (a hero
paragraph, body copy, a heading) without Playwright raising a
strict-mode error, if the multi-match locator gets chained with
`.locator("..")` before a final `.first()` — the result silently
resolves to whatever the FIRST match's ancestor happens to contain,
not necessarily the intended element. `{exact: true}` against a label
that's genuinely a bare, standalone word (not embedded in longer
copy) resolved it cleanly.

Full unit/integration coverage: `get-landing-stats.ts`'s three real
stats (delta assertions against the shared, unscoped `users`/
`postings`/`applications` tables — deliberately never a wholesale wipe
of those tables, the same reasoning the audit log feature, 025,
already established for a different table), a component-level
`landing-hero.test.tsx` covering the real-posting and zero-postings
fallback cases directly via `@testing-library/react` (this project's
established but lightly-used precedent, alongside `listing-card.test.tsx`/
`empty-state.test.tsx`), and `accept-request.ts`'s new `acceptedAt`
write. `e2e/landing-page.spec.ts` (14 tests, zero-violation axe scan)
covers both the unauthenticated and authenticated root-route branches,
real stats/hero-card/genre-counts display, every CTA (hero, final
section; the nav's own "Log in" link, since nav/footer chrome remains
Design System infrastructure out of this feature's scope, same as
every prior feature), footer link correctness, and `acceptedAt`
propagating end-to-end from a real Inbox accept action into this
page's own "parties formed this week" stat on next load — no bypass of
any kind needed.

Schema migration (`0029_landing_page_accepted_at.sql`, adding
`applications.acceptedAt`) pushed to local dev via `drizzle-kit push`
(generate+migrate silently no-op'd against the already-provisioned
local DB, the same recurring quirk documented for every prior
schema-changing feature — verified the column landed via a direct
`information_schema` query, not by trusting the CLI's own success
output).

Full suite green (704 unit, 140 e2e), `npm run build` confirmed.

**This closes out the whole 26-feature build.** Every tracked feature
now has real, shipped, tested code — future work shifts from
ground-up feature building to iteration: bug fixes, refinements, and
revisiting `docs/future-work.md`'s already-logged deferred items
(rating submission, Groups/Clans, a per-game hub page, password reset,
mobile-specific layouts, and the several "define now, adopt later"
mechanisms — `createNotification()`'s still-unwired callers,
`support`/`viewer` roles still functionally identical to `user`, five
of six feature flags still inert — that accumulated across the build).

## `browse.spec.ts`'s CI-only e2e flake — root-caused and fixed (2026-07-15)

The user pasted a real CI failure: `browse.spec.ts`'s "active filter
pills are removable independently" test intermittently failed on
`expect(seriousPill).toBeVisible()` after selecting "Serious" then
"FPS" back-to-back — reproducible in CI, never locally in a single
run (140/140 passed here first try). Root cause: `use-browse-url-
params.ts`'s `replace()` built each new URL from the `useSearchParams()`
hook's snapshot from the *last completed render* — but `router.replace()`
only resolves that hook on the *next* render, so two facet toggles
fired in quick succession both read the same stale params, and the
second silently dropped the first's change. A real correctness bug
(a real user double-clicking two filters could lose one), not just a
flaky test — just far more likely to manifest on a loaded CI runner
than a fast local machine. Fixed by building each update from the live
`window.location.search` instead of the closure-captured snapshot.
Verified: `browse.spec.ts` run 3x back-to-back plus the full 140-test
e2e suite, typecheck, and lint all green.

## Admin Users drawer — view full profile in a new tab implemented (2026-07-15) — 27th feature, an enhancement not a new page

A small, scoped addition to already-shipped Admin Users (016),
prompted by reviewing a newly-designed "Admin Users (Master-Detail)"
wireframe with the user: that wireframe turned out to be a same-scope
layout redesign (drawer → inline side panel), not the bulk multi-user
management the user was actually asking about, and its literal
"Delete user" button would need to be redirected to the existing
soft-ban flow (nothing is ever hard-deleted, ADR 0005) if built as
drawn. Declined for now (`docs/future-work.md`) in favor of a smaller
real gap the same conversation surfaced instead: the drawer showed no
way to see a user's actual public-facing presence.

Went through the full spec/plan/tasks cycle at the user's explicit
request despite the small size (`specs/027-admin-user-profile-link/`,
branch `027-admin-user-profile-link`), all 7 tasks complete. The
drawer (`user-drawer.tsx`) now shows a "View full profile" link next
to the existing Ban/Unban button, pointing at that same user's real
Public Profile (022, `/u/[handle]`) via the `handle` `get-user-
detail.ts` already returns — `target="_blank"` + `rel="noopener
noreferrer"` so the admin queue's tab/state is never disturbed, no new
route/page/schema. Rendered unconditionally for active, flagged, and
banned users alike — a moderator cross-referencing a banned user's
public profile is a real use case, not one to hide.

`e2e/admin-users.spec.ts` gained a new describe block: a real seeded
`role: "moderator"` session (no mocking, no bypass) opens the drawer
for both an active and a banned target user and asserts the link's
`href`/`target`/`rel`. This also retired that file's own stale header
comment claiming the drawer "can't be exercised end-to-end" — no
longer true since Admin Settings (024) shipped the real `role` column;
this is simply the first feature to actually take advantage of that.

## Admin-only AI writing assist implemented (2026-07-15) — 28th feature, first external-AI-provider integration

The user asked for AI (Claude Haiku) writing help on admin-authored
content across "Forum posts, pages, news, etc." Checked before
building: Admin Forum's admin-facing UI (`forum-review-drawer.tsx`) is
moderation-only (hide/remove/escalate/dismiss) — there's no admin
authoring/editing surface there at all, so nothing for an AI control
to attach to. Confirmed with the user: dropped Forum from scope,
logged to `docs/future-work.md`. Scoped to the two real admin
authoring surfaces instead: Admin News' (020) editor and — a real
correction caught mid-plan — the Content Page (021) block editor,
which turned out NOT to live under `/admin/content-pages/` (that
route, `content-page-table.tsx`, is list/create/delete only); it's
actually rendered inline on the real public `/pages/[slug]` route for
a moderator-or-higher session, per 021's own "public render + inline
admin edit" design. Caught by actually reading the code before writing
the plan's file list, not assumed from the route name.

Went through the full spec/plan/tasks cycle (`specs/028-ai-writing-
assist/`, branch `028-ai-writing-assist`), all 24 tasks complete.
**ADR 0007** records the one real architectural tradeoff: Vercel AI
SDK + AI Gateway (`anthropic/claude-haiku-4.5`, a plain model string)
over a direct Anthropic SDK, matching how this project already
provisions Neon through the Marketplace rather than a hand-wired
client. Confirmed the current Haiku alias via a live
`GET https://ai-gateway.vercel.sh/v1/models` call rather than trusting
training-data model names, which drift.

Two admin-only actions (gated at `admin` specifically, stricter than
every other admin page's `moderator` minimum — this generates real
content moderators can already publish, and it's the first external-
AI-provider call):

- **Write from scratch** — a short topic in, a complete structured
  draft out (News: title/excerpt/body; Content Page: a set of blocks),
  via `generateText`'s `output: Output.object()` — this AI SDK version
  has no standalone `generateObject`, confirmed by reading
  `node_modules/ai/docs/` directly rather than assumed from training
  data (exactly the kind of breaking change AGENTS.md warns about).
- **Improve/rewrite** — the admin's own already-drafted text in, a
  revised version out. Implemented as ONE shared, surface-agnostic
  Server Action (`improve-draft-text.ts`) for both News and Content
  Pages: it always operates on plain text, reusing the Content Page
  editor's own existing `blockToText`/`withText` round-trip (already
  handles every block type, including joining a `list` block's items
  with newlines) rather than a bespoke per-block schema. Found by
  reading the existing editor code before designing a new abstraction.

Neither action ever saves or publishes anything itself — both only
populate the same draft form state a human typing would; the existing
save/publish actions are completely unchanged. Every completed action
logs an audit entry (015, `category: "content"`), matching Admin
Settings'/Moderator Audit Log's own established precedent.

**A real design correction surfaced while writing this feature's own
unit tests, worth remembering broadly**: the plan's original approach
trusted the AI SDK's internal `Output.object()` schema conformance
check as the sole validation of the AI's structured response
(Principle II). Writing the Vitest suite — which mocks `generateText`
entirely, per its own test-strategy decision to never make a real,
billed network call in tests — surfaced that this internal SDK
validation is completely bypassed by that mock, meaning a test
asserting "malformed AI output is rejected" couldn't actually prove
anything real. Fixed by re-validating with the same Zod schema
explicitly in `src/lib/ai/gateway.ts` itself — this project's own
established discipline is to validate at ITS OWN boundary, not assume
a third-party dependency's internal, unobservable behavior as the only
guarantee.

Full Vitest coverage of all three Server Actions (`ai` mocked, real
seeded `admin`/`moderator` roles — no bypass of the gate itself,
matching Admin Settings'/Moderator Audit Log's own pattern): role
gate, input validation, audit logging, and the malformed-output
rejection above. `e2e/admin-news.spec.ts`/`e2e/content-page.spec.ts`
extended with a real seeded admin/moderator session proving the
admin-only gate and control-availability state (including "Improve/
rewrite" correctly absent on empty text, and absent on the seeded
page's empty `divider` block) — deliberately never clicking a request
through to a real AI response in an automated test, since Playwright's
own request interception only intercepts browser-made requests, not
the server-side call this Server Action makes, and every CI run making
real, billed, non-deterministic calls to Claude Haiku is unacceptable.
Instead, the real end-to-end Gateway call was verified once, live,
outside the test suite (a real structured News draft and a real plain
rewrite, both against the actual provisioned `AI_GATEWAY_API_KEY`) —
confirming the actual wiring works beyond what the mocks alone prove.

Full suite green (updated unit count reflecting the new tests, full
142+ e2e), typecheck and lint clean.

## Real image upload for News post covers implemented (2026-07-15) — 29th feature, first user-uploaded-file capability

The user pointed at a screenshot of the Admin News editor's Cover
section: four gradient color swatches, no way to pick a real image.
Checked before building: feature 020's own spec explicitly scoped this
out ("Replace image" stays decorative, "no real imagery yet") — this
feature deliberately reverses that decision for just this one field,
per the user's ask.

Went through the full spec/plan/tasks cycle
(`specs/029-news-cover-image-upload/`, branch
`029-news-cover-image-upload`), all 17 tasks complete. **ADR 0008**
records the storage choice: Vercel Blob (`access: "public"`) over
storing bytes in Postgres, reusing the existing `newsPosts.cover` text
column as-is — no migration. A new shared `newsCoverStyle()` helper
distinguishes a gradient CSS string from a real image URL by shape
alone (a value starting with `http` is an image) and was adopted by
all 6 real consumers that show a News post's cover: the feed cards,
the featured post, the article's own page, related-article lists,
Profile's Saved tab, and the admin list thumbnail — a real DRY
consolidation of six previously-duplicated inline styles. Gated at
`moderator` (matching the rest of the Admin News editor, not
admin-only like feature 028's AI assist, since this is a normal
editing action). `upload-news-cover-image.ts` validates file type
(JPEG/PNG/WebP) and a 5MB size cap with plain checks (not a Zod-on-File
pattern) before ever calling Blob, leaving the existing draft
completely untouched on any rejection.

**A real Setup-phase gap, found and closed**: no Vercel Blob store
existed on this project yet (`vercel blob list` confirmed
`BLOB_STORE_ID` unset). Provisioned one via `vercel blob create-store
playm8z-news-covers --access public --yes`, which — again — triggered
a full local `env pull` as a side effect, wiping `AUTH_SECRET`/
`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`AI_GATEWAY_API_KEY` from
`.env.local` and replacing `DATABASE_URL` with Neon's, the identical
risk already documented from the earlier Neon Marketplace `env pull`
incident — just triggered by a completely different-sounding command
this time (`create-store`, not `integration add` or `env pull`
themselves). Restored immediately since the correct local values were
still in this session's own context; no real secret was lost, but this
confirms the risk is generic to `--yes`/non-interactive Vercel CLI
flags broadly, not specific to any one subcommand. `BLOB_READ_WRITE_TOKEN`
itself was a welcome side effect of the same command — already synced
to Production/Preview/Development on Vercel with no extra step needed
this time (unlike `AI_GATEWAY_API_KEY`, which needed a manual
`vercel env add` per environment).

Same e2e philosophy as feature 028: `e2e/admin-news.spec.ts` proves
only that a real seeded moderator sees the upload control (and a
non-moderator doesn't, via the page's existing gate) — never a real
upload triggered in CI, since Playwright can't intercept the
server-side Blob write any more than it could intercept the AI Gateway
call, and this project isn't adding a new secret to
`.github/workflows/ci.yml` for what this feature needs to prove.
Unlike an LLM call, a real Blob write is cheap/free-tier/deterministic,
so the real end-to-end round trip (upload a real PNG → get back a
public URL → fetch it and confirm `image/png` content-type) was
verified once, live, outside the test suite, then cleaned up
(`del()`). The Foundational render-helper adoption was checkpointed by
running the full 150-test e2e suite *before* the upload capability
itself was built, to prove zero visual regression for already-
published gradient-only posts.

Full Vitest coverage of `upload-news-cover-image.ts` (moderator gate
via a real seeded role, file-type/size rejection before any Blob call,
`put()` called with `access: "public"`) and `newsCoverStyle()`'s three
branches (gradient/image/null-fallback), `@vercel/blob` mocked
throughout. Full suite green, typecheck and lint clean.

## Cover image upload hang — fixed (2026-07-15)

The user reported live: uploading a News cover image "just hangs
there and doesn't change the image." Root cause: Next.js Server
Actions default to a 1MB request-body cap — well under this feature's
own advertised 5MB limit — so any real photo between 1–5MB was
silently rejected by the framework itself, before
`upload-news-cover-image.ts`'s own validation ever ran. Compounded by
a missing `try/catch` in `news-post-editor.tsx`'s upload handler: a
*thrown* failure (as opposed to a returned `{ success: false }`) left
`coverUploading` stuck `true` forever, with no error surfaced — exactly
matching the reported symptom. Fixed both: raised
`next.config.ts`'s `serverActions.bodySizeLimit` to `6mb`, and wrapped
the handler in `try/catch/finally` so any thrown failure now shows a
clear error and always releases the pending state. Verified live with
a real 2MB upload (well over the old 1MB cap) completing correctly;
full suite green.

## Blockers

- None.
