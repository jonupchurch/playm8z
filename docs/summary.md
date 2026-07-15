# playm8z — Codebase Orientation TL;DR

## 1. Architecture at a Glance

**Stack**: Next.js 16 (App Router, TypeScript strict), Drizzle ORM over PostgreSQL (Neon in prod), Auth.js v5 (`next-auth@5-beta`), Tailwind CSS v4, Zod v4 for validation, deployed on Vercel. Test stack: Vitest (unit/integration) + Playwright (e2e, with `@axe-core/playwright` for accessibility).

**Important — this is not the Next.js you remember**: `AGENTS.md` flags real breaking changes. The concrete one found in this repo: there is **no `middleware.ts`** — the equivalent file is **`src/proxy.ts`**, exporting a `proxy()` function instead of `middleware()`.

### Request flow
- **Routing**: standard App Router under `src/app`, with route groups (`(auth)`) and dynamic segments (`[id]`, `[slug]`, `[conversationId]`, `[handle]`).
- **Edge/global interception**: `src/proxy.ts` runs on almost every request (matcher excludes `/api`, `/_next/*`, favicons) and implements sitewide maintenance-mode short-circuiting — reads the singleton `settings` row, rewrites to `/maintenance` unless the path is `/admin/*`, `/maintenance`, or `/login`, or the caller is an `admin`-ranked session.
- **Mutations go through Server Actions almost exclusively** — `src/lib/actions/*.ts`, each file a single `"use server"` function (e.g. `apply-to-posting.ts`, `send-message.ts`, `toggle-follow.ts`). ~60 action files.
- **API route handlers (`src/app/api/**/route.ts`) are the exception**, used only where a Server Action doesn't fit: NextAuth's catch-all (`api/auth/[...nextauth]`), pre-auth signup flows (`api/auth/register`, `api/auth/check-handle`, `api/auth/verify-email`), the onboarding wizard's multi-step submit (`api/onboarding`), and one CSV export (`admin/audit-log/export/route.ts`, a GET handler because CSV download needs a real response, not a Server Action).
- **Auth/session**: `src/auth.ts` configures NextAuth with `DrizzleAdapter`, JWT session strategy (required because the Credentials provider can't use adapter-backed DB sessions), Google OAuth + Credentials (bcrypt via `bcrypt-ts`) providers. Two custom callbacks: `signIn` auto-reactivates a deactivated account and fixes a Google `emailVerified` override bug; `events.createUser` initializes a settings-driven default for OAuth signups.
- **Authorization gates** (three tiers, all in `src/lib/auth/`, all re-query the DB fresh — never trust the JWT for role/verification state):
  - `requireAuth()` — any authenticated session (editing your own stuff).
  - `requireVerifiedEmail()` — authenticated **and** email-verified (public-facing writes: posting, applying, messaging).
  - `requireRole(minimum)` / `getCurrentRole()` — 5-tier role model `user < support/viewer < moderator < admin`, calls Next.js's native `unauthorized()`/`forbidden()` helpers. Gates every `/admin/*` route and action.

### Directory layout convention
```
src/app/            routes only — pages, layouts, route handlers, colocated *.test.ts for API routes
src/components/     one subfolder per feature area (admin/, forum/, inbox/, listing/, profile/, nav/, ...) — mostly client components
src/lib/
  actions/          Server Actions ("use server"), one file per mutation, each with a sibling *.test.ts
  validations/       Zod schemas, one file per feature, each with a sibling *.test.ts
  <feature>/         read/query helpers per feature area (admin/, forum/, inbox/, news/, notifications/, postings/, profile/, settings/, users/, content-page/, moderation/, landing/, email/, hooks/)
  auth/              the three gate helpers above + sign-in side effects
src/db/              schema.ts (single file, all tables) + index.ts (drizzle client)
docs/                ADRs (docs/adr/0001-0006), feature-list.md, future-work.md
specs/               one directory per feature (001-auth-onboarding … 026-landing-page): spec.md/plan.md/tasks.md/research.md/data-model.md
.specify/            Spec-Kit tooling + constitution.md
e2e/                 Playwright specs, one file per feature area
```

## 2. Data Model (src/db/schema.ts)

Core entities and how they connect:

- **`users`** — the hub. Holds auth fields (`email`, `passwordHash`, `emailVerified`), identity (`handle` — unique, immutable, the only public identity per ADR 0006 — real name is never shown), onboarding profile fields (`region`, `platforms`, `ageGroup`, `vibe`, `playTimeSlots`, `gamesPlayed`), privacy toggles, moderation state (`deactivatedAt`, `bannedAt`), and `role` (5-tier enum described above).
- **`postings`** — a game session someone is hosting. FK `hostId → users`. `game` is a free-text keyword, not a catalog FK (ADR 0001, "game-as-keyword"). Carries filtering facets (`genre`, `ageGroup` [18/21 only, ADR 0002], `timeSlots[]`, `platform`, `tags[]`), capacity (`seatsTotal`/`seatsOpen`), and moderation fields (`removedAt`, `autoFlagReason`, `moderationReviewedAt`).
- **`applications`** — a join request against a `posting` (FK `postingId`, `applicantId → users`). `status`: pending/accepted/declined/withdrawn. `initiatedBy` (`applicant`|`host`) supports host-initiated invites reusing the same table. `acceptedAt` drives the landing page's "parties formed this week" stat.
- **`questions`** — public Q&A per posting, host-only replies.
- **`savedListings`** / **`savedNewsPosts`** — user bookmarks (composite PK, hard-deleted on unsave — a deliberate exception to the no-hard-delete rule since bookmarks carry no audit value).
- **`userGames`** — per-user richer game list (game + rank + hours), the real, currently-maintained source of "games played" (NOT `users.gamesPlayed`, which is a stale onboarding-only snapshot).
- **`blocks`** — asymmetric block relationship between two users; soft-closed via `unblockedAt`, never deleted (real trust/safety history).
- **`reports`** — polymorphic (`targetType`/`targetId`, no FK) moderation reports against users/postings/forum content/messages. `status`, `resolvedAt`.
- **`forumThreads`** / **`forumReplies`** — forum content. `categoryId` is a hardcoded key, not a table FK. Both carry the same moderation triplet (`removedAt`, `autoFlagReason`, `moderationReviewedAt`); `forumThreads.locked` gates new replies.
- **`likes`** — polymorphic per-user like (`targetType`: thread|reply|newsPost) with a DB-level unique constraint (prevents double-like races); denormalized `likes` counts also live on `forumReplies`/`forumThreads`.
- **`threadSubscriptions`** — per-user thread-follow preference (no delivery mechanism wired yet).
- **`conversations`** / **`messages`** — messaging. `conversations.memberIds` is a Postgres array (app-validated, not FK-enforced); `lastReadAt` is a per-member JSONB read-cursor driving unread counts. `messages.senderId` nullable for system messages; `removedAt` for moderation.
- **`notifications`** — polymorphic notification feed (`type`: join/accepted/reply/mention/message/rating/news/system); `join`/`accepted` are synthesized live from `applications` rather than stored.
- **`newsPosts`** — CMS-authored articles (`status`: draft/published/scheduled, `slug` unique+immutable, `tags[]`, markdown `body`).
- **`newsletterSubscribers`** — no-auth-required email capture, DB-unique-constraint-only dedupe.
- **`contentPages`** — generic CMS pages (`blocks` is one ordered JSONB array, not normalized rows); `system=true` for About/Privacy/Terms.
- **`auditEntries`** — append-only moderation/admin audit trail (`actorId` nullable = system-generated), the only table that's never updated after insert.
- **`warnings`** — polymorphic (`targetType`/`targetId`) moderator warnings issued to a user; append-only.
- **`follows`** — asymmetric follow relation, hard-deleted on unfollow.
- **`reviews`** — player ratings/reviews; schema exists, no write path yet (rating submission is deferred, see `docs/future-work.md`).
- **`settings`** — singleton config row (only ever UPDATEd, never a second row inserted): maintenance mode, site branding, moderation/auto-flag toggles, feature flags, safety defaults.
- Auth.js standard tables: `accounts`, `sessions`, `verificationTokens`.

**Recurring schema pattern**: rather than adding a new FK column per new moderation consumer, the schema repeatedly generalizes to a polymorphic `targetType`/`targetId` pair once a **third** real consumer appears (`reports`, `likes`, `warnings`, `notifications` all follow this). Nothing in the app is ever hard-deleted except a short, explicit allowlist with no audit value (saved items, likes, follows, thread subscriptions) — everything else uses a `removedAt`/`bannedAt`/`unblockedAt`-style soft flag (ADR 0005).

## 3. Major Feature Areas

| Area | What it does | Owning files/dirs |
|---|---|---|
| **Auth & Onboarding** | Sign up (Google or email/password), email verification, 4-step onboarding wizard collecting region/platforms/vibe/games. | `src/app/(auth)/**`, `src/app/api/auth/**`, `src/app/api/onboarding/route.ts`, `src/auth.ts`, `src/components/auth/*` |
| **Home / landing** | `/` — authenticated users get a search-first discovery feed (live filter/sort, Trending row); unauthenticated visitors get a real marketing landing page with live-computed stats (players, games, parties formed this week) and genre-filtered CTAs. | `src/app/page.tsx`, `src/components/home/*`, `src/components/landing/*`, `src/lib/landing/*` |
| **Browse / postings** | `/browse` — full server-side faceted search (game/region/genre/age/time/platform/mic), live facet counts, URL-driven filters+sort, empty state. | `src/app/browse/page.tsx`, `src/components/browse/*` |
| **Post a Game** | `/post` — listing-creation form with live preview, gated behind `requireVerifiedEmail`. | `src/app/post/page.tsx`, `src/components/post-game/*` |
| **Listing detail & applications** | `/listing/[id]` — apply/withdraw to a posting, public Q&A (host-only replies), derived roster (no role labels, ADR 0004), Share/Save/Report. | `src/app/listing/[id]/page.tsx`, `src/components/listing/*`, `src/lib/actions/apply-to-posting.ts`, `ask-question.ts`, `reply-to-question.ts`, `withdraw-application.ts` |
| **Profile / Account settings** | `/profile/*` — overview, my postings, saved (listings + news), account (email/password/privacy/deactivation/danger zone). | `src/app/profile/**`, `src/components/profile/*`, `src/lib/profile/*` |
| **Blocked Users** | `/profile/account/blocked` — block/unblock modal flows built on native `<dialog>`. | `src/app/profile/account/blocked/page.tsx`, `src/components/blocking/*`, `src/lib/actions/block-user.ts`/`unblock-user.ts` |
| **Forum (index + thread)** | `/forum` category/search/sort listing with pinned threads and a HOT badge; `/forum/thread/[id]` reply thread with quoting, likes, subscriptions, reporting. | `src/app/forum/**`, `src/components/forum/*`, `src/lib/forum/*` |
| **Inbox / messaging** | `/inbox` two-pane conversation list + chat, merges real conversations with pending join requests, group/direct compose, host Accept/Decline. First `db.transaction()` in the codebase (`accept-request.ts`). | `src/app/inbox/**`, `src/components/inbox/*`, `src/lib/inbox/*` |
| **Notifications + Report modal** | Nav bell dropdown + `/notifications` page (filters, grouping, mark-read); reusable 3-step Report modal used across features. | `src/app/notifications/page.tsx`, `src/components/notifications/*`, `src/components/nav/notification-bell.tsx`, `src/components/reports/report-modal.tsx`, `src/lib/notifications/*` |
| **News (public feed + article detail)** | `/news` category/search feed with featured post + newsletter signup; `/news/[slug]` article with markdown render, like/save, keep-reading, share. | `src/app/news/**`, `src/components/news/*`, `src/lib/news/*` |
| **Content Pages (public)** | `/pages/[slug]` — renders CMS pages; moderators get inline edit/publish/unpublish directly on the page. | `src/app/pages/[slug]/page.tsx`, `src/components/content-page/*`, `src/lib/content-page/*` |
| **Public Profile** | `/u/[handle]` — identity, computed stats, games, open postings with inline request, reviews (read-only), follow/message/invite, "in common" sidebar. | `src/app/u/[handle]/page.tsx`, `src/lib/users/*` |
| **Admin & Moderation suite** | `/admin` dashboard (KPIs, activity chart, needs-attention, top games), plus dedicated queues for `/admin/users`, `/admin/postings`, `/admin/forum`, `/admin/reports` (unified cross-source triage), `/admin/news` (CMS editor), `/admin/content-pages`, `/admin/settings` (general/maintenance/moderation/roles/feature-flags/safety), `/admin/audit-log` (searchable, CSV export). All gated by `requireRole()`, most at `moderator`, Settings at `admin`. | `src/app/admin/**`, `src/components/admin/*`, `src/lib/admin/*`, `src/lib/moderation/*`, `src/lib/settings/*` |
| **Shared nav shell** | Root-layout-mounted `SiteHeader` (logo, nav links, notification bell, profile menu), the only cross-cutting UI shell in the app — built relatively late (feature 012) after many features shipped without one. | `src/components/nav/site-header.tsx`, `nav-links.tsx`, `profile-menu.tsx`, `site-header-frame.tsx` |
| **Error/maintenance pages** | Native Next.js error surfaces (`not-found.tsx`, `error.tsx`+`global-error.tsx`, `forbidden.tsx`/`unauthorized.tsx`) driven by one shared `error-state.tsx`; `/maintenance` page + `src/proxy.ts` sitewide gate. | `src/app/{error,global-error,forbidden,unauthorized,not-found,maintenance}*.tsx`, `src/components/errors/error-state.tsx`, `src/proxy.ts` |

Out of scope / explicitly deferred (see `docs/future-work.md`): Groups/Clans, per-game hub pages, password reset, rating submission write path, mobile-specific layouts, Steam/Discord login.

## 4. Conventions Worth Knowing

- **Spec-Kit-driven, feature-gated workflow**: every one of the 26 features has `specs/NNN-feature-name/{spec,plan,tasks,research,data-model}.md` and was built branch-per-feature. Constitution lives at `.specify/memory/constitution.md`. `docs/feature-list.md` is the authoritative status/progress tracker with rich per-feature "what was actually found and fixed" notes — read it before touching any feature, it's more reliable than the spec files alone for "does this actually work yet."
- **Validation/trust boundary**: Zod schemas in `src/lib/validations/*.ts` (one file per feature area, each with a colocated `*.test.ts`) are the single point of input validation; Server Actions call `.safeParse()` before touching the DB. Client-side constraints (e.g. stepper clamping) are always re-validated server-side.
- **Auth gates are layered by strictness, not one-size-fits-all**: `requireAuth` (self-edits) < `requireVerifiedEmail` (public-facing writes) < `requireRole(minimum)` (admin/moderation). All three re-query the DB by session email on every call — role/verification changes take effect immediately, nothing is cached in the JWT.
- **Soft-delete discipline (ADR 0005)**: nothing is ever hard-deleted platform-wide except a small, explicit, reasoned allowlist (saved-listing/saved-news/likes/thread-subscriptions/follows) that carries no trust/safety history. Everything else gets a `removedAt`/`bannedAt`/`unblockedAt`-style timestamp flag, checked at every read site.
- **Polymorphic tables over parallel FK columns**: `reports`, `likes`, `warnings`, `notifications` all use `targetType`/`targetId` (no DB-level FK) instead of adding a new nullable column per content type — the project's stated rule is "generalize once a third real consumer appears."
- **Tests are colocated, not in a separate `__tests__` tree**: every action/query/validation file has a sibling `*.test.ts` right next to it. E2E specs live in top-level `e2e/`, one file per feature area, using Playwright + `@axe-core/playwright` for a zero-violation accessibility check per feature.
- **Both Vitest and Playwright are forced fully serial** (`vitest.config.ts`: `fileParallelism: false`, `pool: "forks"`, `maxWorkers: 1`; `playwright.config.ts`: `workers: 1`) because several integration tests mutate shared global Postgres state (unscoped deletes/inserts on `postings`, the singleton `settings` row, etc.) — parallel file execution caused real intermittent races.
- **Drizzle error unwrapping gotcha**: Drizzle wraps the raw `postgres.js` error in `DrizzleQueryError`; the real Postgres error code is at `err.cause.code`, not `err.code`. Several unique-violation catch blocks across the codebase were fixed once this was discovered — worth checking if writing new unique-constraint handling.
- **`src/proxy.ts` is this Next.js version's `middleware.ts` replacement** — a real breaking-change trap; don't go looking for a `middleware.ts` file.
- **`revalidatePath(path, "layout")` needed, not client-side `router.push()` + `router.refresh()`** — this Next.js version's client refresh-after-push can lose a race; cache invalidation is done server-side inside Server Actions instead.
- **Native `<dialog>` for all modals** (Block/Unblock, Report, New Thread, Compose, Admin review drawers) — no modal library. Tailwind gotcha found here: `hidden open:flex` is required instead of a bare `flex` utility, because Tailwind v4's `@layer`-based utilities beat the UA stylesheet's `dialog:not([open]) { display: none }` in the cascade.
- **Shared query helper pattern**: each feature area's read logic lives in `src/lib/<area>/get-*.ts` / `search-*.ts` files, kept separate from the `src/lib/actions/*.ts` mutation files — a clean read/write split per feature.
- **`src/lib/moderation/`** holds the shared, extracted-once-a-second-consumer-appeared cross-feature helpers: `auto-flag-rules.ts` (deterministic scam/boosting/new-account heuristics), `reason-severity.ts` (report-reason → severity mapping), `classify-forum-target.ts` (thread-vs-reply disambiguation), `auto-hide.ts` (computed, never-stored auto-hide-after-N-reports rule).
- **`src/lib/settings/get-settings.ts`** has its own 5-second in-memory TTL cache **separate from** Next.js's `revalidatePath` cache — both must be invalidated at the same write site, they don't invalidate each other.
