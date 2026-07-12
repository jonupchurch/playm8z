# Quickstart: Validating Post a Game

Manual + automated validation once this feature is implemented. Assumes
local dev is already set up (`npm install`, local Postgres running,
`.env.local` populated — see `status.md`) and at least one verified
test account exists (Auth & Onboarding).

## Setup

```bash
npm run dev
```

## Scenario 1 — Happy path publish

1. Log in as a verified user, visit `/post`.
2. Enter a game and a title only — confirm Publish becomes enabled.
3. Edit a few more fields (genre, vibe, region, tags) — confirm the
   live preview updates immediately for each, showing your own display
   name/avatar color.
4. Adjust Group size down below the current Spots-open value — confirm
   Spots open clamps down automatically.
5. Select Publish — confirm a new posting exists with status "open,"
   and that it appears on Home and Browse immediately.

## Scenario 2 — Logged-out visitor

1. Log out, request `/post`.
2. Confirm redirection to `/login` instead of seeing the form.

## Scenario 3 — Unverified user blocked from publishing

1. Log in as an account that hasn't verified its email yet.
2. Fill in game + title, attempt to publish.
3. Confirm the action is blocked with a message directing you to
   verify your email, and confirm no posting was created.

## Scenario 4 — Validation guardrails

1. Leave the game field empty (title filled) — confirm Publish stays
   disabled/blocked.
2. Leave the title field empty (game filled) — confirm the same.
3. Type past 60 characters in the title — confirm input is capped, not
   silently truncated after submission.
4. Attempt a direct request bypassing the UI's stepper clamping (e.g.
   via a script) with `seatsOpen` greater than `seatsTotal - 1` —
   confirm the server rejects it even though the UI would never
   produce that combination itself.

## Automated tests

- `npm test` — unit tests for `posting.ts`'s Zod schema (including the
  Group size/Spots open cross-field refinement) and for
  `create-posting.ts`'s auth/verification gate and insert logic.
- `npm run test:e2e` — `e2e/post-game.spec.ts` covering Scenarios 1-4,
  with an axe-core accessibility scan.
