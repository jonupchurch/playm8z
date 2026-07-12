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

### Known gaps
- No test framework installed yet (noted as an open item in the
  constitution's Test Discipline principle).
- No sign-in/sign-up UI — only the Auth.js machinery is wired up.
- Google OAuth credentials not yet created/set.
- Nothing deployed; local dev only.
