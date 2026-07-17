# Quickstart: Password Reset

## Try it locally

No `RESEND_API_KEY` is needed and you should not set one. Without it,
`send-email.ts` prints the message to the dev-server console instead of
sending — that's the documented local path, and it's how you get the link.

1. `npm run dev`
2. Create a Credentials account (`/signup`) — or use any seeded account
   that has a `passwordHash`. A Google account **will not work**; it has no
   password, and you'll get the "this account uses Google" mail instead
   (that's FR-005 working, not a bug).
3. Go to `/login` → **Forgot password?** → submit the address.
4. Read the reset link out of the **dev-server console**, not your inbox.
5. Open it, set a new password, then log in with it.

**Expect the old password to stop working, and expect not to be logged in
automatically** — that's FR-019, not an oversight.

## Things that look broken but aren't

- **Every address says the same thing**, including addresses that don't
  exist. That's FR-004. If you can tell a registered address from an
  unregistered one by the response, that's the bug.
- **Requesting twice in a minute sends one mail.** FR-020's throttle. The
  screen still says exactly what it always says — deliberately, since
  saying "slow down" would leak that the address exists.
- **The second link works and the first doesn't.** FR-009: issuing a link
  supersedes earlier ones.
- **You can't find the token in the database.** By design — only its
  SHA-256 hash is stored (FR-012). The raw token exists solely in the link.

## Getting the token in a test

Hash it the same way the code does and look it up; or read the newest row
for the user and mint the link yourself. **Never scrape the console log** —
that couples the test to a fallback path that doesn't exist in production.

```ts
import { createHash } from "node:crypto";
const tokenHash = createHash("sha256").update(rawToken).digest("hex");
```

## Verifying session revocation (ADR 0010)

The part most likely to be quietly wrong in both directions:

- Log in on two browser contexts, reset the password in one, then confirm
  the **other** context is signed out on its next request — including on a
  page it can only read, not just on a write.
- Then confirm an **unrelated** account's session is *untouched*. A
  revocation bug that logs everyone out passes any test that only checks
  "the stale session died".

## Gotchas that have already bitten this repo

- Schema changes: `npx drizzle-kit push`, **not** `npm run db:migrate`
  (silently no-ops here). If it prompts about a rename, it will hang —
  split into two unambiguous pushes. Verify the column landed by querying
  the DB, not by the exit code.
- Production applies schema itself via `vercel-build`; don't hand-push
  after merging.
