# Status

**Phase**: Infrastructure scaffold complete, constitution ratified.
First feature spec (Auth & Onboarding) in progress.
**Last updated**: 2026-07-12

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
Email verification's gated-UX and provider choice remain deferred to
the Auth feature's own implementation, not urgent now.

## Next up

- Auth & Onboarding is the first feature being taken through
  `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks`. Per the project-wide gate (constitution v1.0.0),
  every other feature in `docs/feature-list.md` needs the same full
  treatment before implementation begins on *any* of them — this is
  the start of a long sequence, not a one-off.
- Awaiting the user to drop the Design System / Brand Identity
  `.dc.html` files into `resources/design/`.

## Blockers

- None.
