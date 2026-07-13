# Status

**Phase**: Infrastructure scaffold complete, constitution ratified.
Auth & Onboarding is the first feature to clear the full spec/plan/tasks
gate; implementation still waits on every other feature reaching the
same point.
**Last updated**: 2026-07-13

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

- Decide implementation order for the remaining ~24 features — likely
  Home next (foundational, and Landing/Post a Game/Browse all build on
  its `postings` table), but this is an open question for the user
  rather than a predetermined sequence.
- Real Resend wiring remains blocked on domain ownership (unchanged);
  verification emails still log to the server console.
- `users.role` and real admin gating remain blocked on Admin Settings
  (feature #24) being implemented — `require-role.ts` is ready and
  waiting.

## Blockers

- None.
