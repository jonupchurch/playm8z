# playm8z

**Find people to play anything with.** Post the games you want to play, set
the vibe, and match with players who fit — casual or competitive, any game,
any platform.

🔗 **Live: [www.playm8z.net](https://www.playm8z.net)**

playm8z is a looking-for-group (LFG) platform for games of every kind —
shooters, RPGs, MOBAs, party games, and tabletop/TTRPG alike. A host posts
what they want to play and who they're after; players browse open parties,
filter by game, region, vibe, and open seats, and request to join. Around
that core sit a community forum, a news feed, player profiles with reviews,
direct messaging, and a full moderation/admin suite.

## What's inside

- **Browse & Post** — create an LFG posting for any game (free-text, no
  fixed catalog), browse and filter open parties, request to join, manage
  your party's roster. Postings auto-expire after 30 days unless renewed.
- **Home** — a live feed of open parties and a "Trending Now" strip computed
  from what people are actually looking to play right now.
- **Forum** — threaded community discussion with moderation.
- **News** — an editorial feed with an admin editor (cover images, optional
  AI writing assist).
- **Profiles** — public player profiles with games, stats, and reviews;
  private account settings, privacy controls, and blocking.
- **Inbox & Notifications** — direct messages, join requests, and in-app
  alerts.
- **Admin** — dashboards and review queues for users, postings, forum, news,
  and reports, plus site settings and editable content pages (Terms,
  Privacy, About, etc.).
- **Auth** — Google OAuth and email/password sign-in, a guided onboarding
  wizard, email verification, and password reset.

## Tech stack

- **[Next.js](https://nextjs.org) App Router** (React, TypeScript) —
  server components with server actions as the write path.
- **[Drizzle ORM](https://orm.drizzle.team) + PostgreSQL** —
  [Neon](https://neon.tech) in production, local Postgres in development.
- **[Auth.js v5](https://authjs.dev)** — Google OAuth + Credentials, JWT
  sessions.
- **[Tailwind CSS](https://tailwindcss.com)** — a dark, brand-driven design
  system.
- **[Vercel](https://vercel.com) platform** — hosting, plus Blob (image
  uploads), the AI Gateway (admin writing assist, via Claude Haiku), and
  [Resend](https://resend.com) for transactional email.
- **Testing** — [Vitest](https://vitest.dev) (unit/integration) +
  [Playwright](https://playwright.dev) (end-to-end), run in CI on every push.

## How it's built: spec-driven

Every feature is specified, planned, and broken into tasks **before** any
code, using [Spec Kit](https://github.com/github/spec-kit). The paper trail
is part of the repo and kept in sync with the code:

- **[`.specify/memory/constitution.md`](.specify/memory/constitution.md)** —
  the project's governing principles (spec-driven development, validate at
  trust boundaries, test behaviour, scope discipline, no silent history
  loss).
- **[`specs/`](specs/)** — one directory per feature
  (`spec.md` → `plan.md` → `research.md` → `data-model.md` → `tasks.md`),
  33+ features and counting.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records for every
  call with a real tradeoff.

### Key architectural decisions

| ADR | Decision |
|-----|----------|
| [0001](docs/adr/0001-game-as-free-text-keyword.md) | `game` is a free-text keyword, not a curated catalog — Browse/Trending aggregate on the raw string. |
| [0002](docs/adr/0002-minimum-age-18-plus.md) | 18+ only; no under-18 tier. |
| [0005](docs/adr/0005-no-hard-deletes.md) | Nothing is ever hard-deleted — records are disabled, never removed. |
| [0006](docs/adr/0006-handle-only-public-identity.md) | Public identity is the handle; display names aren't shown publicly. |
| [0007](docs/adr/0007-ai-writing-assist-via-vercel-ai-gateway.md) | AI writing assist runs through the Vercel AI Gateway (Claude Haiku). |
| [0008](docs/adr/0008-news-cover-images-via-vercel-blob.md) | Image uploads use Vercel Blob. |
| [0010](docs/adr/0010-session-revocation-via-sessions-valid-after.md) | JWT sessions are revoked by dating them, not deleting rows. |

(See [`docs/adr/`](docs/adr/) for the full set.)

## Getting started

### Prerequisites

- Node.js 20+
- A local PostgreSQL database

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in DATABASE_URL (local Postgres) and AUTH_SECRET at minimum.
# Google OAuth, Blob, AI Gateway, and Resend keys are optional locally —
# see the comments in .env.example for what each unlocks.

# 3. Apply the schema to your local database
npx drizzle-kit push

# 4. Run the dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

> **Note on migrations:** this project applies schema changes with
> `drizzle-kit push`, not `db:migrate`. Production reconciles its schema
> automatically on deploy (the Vercel build runs `drizzle-kit push`).

### Useful scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test` | Unit/integration tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npx drizzle-kit push` | Apply the schema to your database |
| `npx drizzle-kit studio` | Browse the database |

## Testing

```bash
npm run test        # Vitest — unit + integration
npm run test:e2e    # Playwright — end-to-end (starts its own dev server)
```

Both suites run in CI (GitHub Actions) on every push. Unit/integration tests
hit a real local database; end-to-end tests drive the app in a browser.

## Deployment

Deployed on **Vercel**, serving [www.playm8z.net](https://www.playm8z.net).
Each push to `main` builds and deploys automatically; the build step also
runs `drizzle-kit push`, so the production schema reconciles itself on every
deploy. The database is Neon Postgres, provisioned through the Vercel
Marketplace.

## Project structure

```
src/
├── app/            # Next.js App Router — routes, pages, API handlers
├── components/     # React components, grouped by feature area
├── lib/
│   ├── actions/    # Server actions (the write path)
│   ├── auth/       # Auth helpers and gates
│   ├── validations/# Zod schemas at every trust boundary
│   └── …           # Feature-specific read queries and helpers
└── db/             # Drizzle schema and client
specs/              # Per-feature spec → plan → tasks
docs/adr/           # Architecture Decision Records
.specify/           # Spec Kit config + the constitution
```
