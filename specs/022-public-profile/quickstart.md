# Quickstart: Public Profile

## Prerequisites

- Local dev DB migrated with this feature's schema changes (`follows`,
  `reviews`, `applications.initiatedBy`) plus `001`'s user fields,
  `003`'s postings, `006`'s applications, `008`'s blocks, `011`'s
  conversations, `012`'s report flow.
- Two authenticated, email-verified sessions (viewer and profile
  owner), plus a logged-out browser context.
- Seed data: the profile owner has a bio, `gamesPlayed`, at least one
  open hosted posting with an available seat, and (for one scenario)
  no reviews yet. The viewer follows at least one account the profile
  owner also follows, and shares at least one game with them. The
  viewer also hosts their own open posting with an available seat.

## Manual Scenarios

1. **Public view, logged out** — as a logged-out visitor, visit
   `/u/:handle`. Confirm identity/bio/stats (rating+reviews,
   sessions)/games/open postings/reviews (or "No reviews yet") all
   render, and none of the six dropped elements (online dot,
   reliability %, groups, per-game rank/hours, level, pronouns/
   languages/timezone) appear anywhere.

2. **Not-found handle** — visit a nonexistent handle; confirm Error
   Pages' (`002`) not-found response.

3. **Follow/Unfollow** — as the viewer, select "Follow"; confirm the
   button shows "Following" and a `follows` row exists. Select it
   again; confirm it reverts and the row is gone.

4. **Message** — select "Message"; confirm it opens/starts a
   conversation with the profile owner (`011`).

5. **Invite to a party** — as the viewer (hosting an open posting with
   an available seat), select "Invite to a party," choose that
   posting; confirm a new `pending`, `initiatedBy = 'host'` Application
   exists, and it appears in the PROFILE OWNER's own Inbox (not the
   viewer's) as a pending request.

6. **Accept an invite** — as the profile owner, accept that pending
   invite from their Inbox; confirm it resolves exactly like an
   accepted applicant-initiated application (seat count decrements,
   the posting fills if that was the last seat, a conversation is
   established).

7. **No eligible posting** — as a different viewer who hosts no open
   posting with an available seat, confirm "Invite to a party" is
   disabled/explained, not a dead click.

8. **You have in common** — as the viewer (who shares a mutual follow
   and a game with the profile owner), confirm the sidebar shows an
   accurate mutual-follow count/avatars and the correct shared-games
   intersection. Confirm this sidebar doesn't appear for a logged-out
   visitor or on the profile owner's own view of their own profile.

9. **Report/Block** — select "Report user"; confirm Notifications +
   Report modal's (`012`) canonical flow opens. Select "Block user";
   confirm Blocked Users' (`008`) existing block action runs.

10. **Unauthenticated/unverified gating** — attempt Follow/Message/
    Invite as a logged-out visitor; confirm each routes to log in.
    Attempt as an unverified session; confirm each shows a
    verify-your-email message.

## Automated tests

- Unit: `public-profile.ts` Zod schemas; `get-public-profile.ts`'s
  computed `sessions` stat (research.md #2); `get-in-common.ts`'s
  mutual-follow and shared-games computation (research.md #5).
- Integration: `toggle-follow.ts` (create/delete, self-follow
  rejection); `invite-to-party.ts` (eligibility validation, correct
  `initiatedBy`/`applicantId`/`postingId`); `011`'s amended
  `accept-request.ts`/`decline-request.ts` (authorized-actor branch
  for both `initiatedBy` values, including rejecting the wrong party);
  `011`'s amended `get-inbox-list.ts` (surfaces a host-initiated
  pending invite to the invited user).
- E2E (`e2e/public-profile.spec.ts`): public view (logged out and in),
  not-found handle, Follow/Unfollow, Message, Invite end-to-end
  (across two sessions), mutual-connections display, Report/Block,
  unauthenticated/unverified gating, with an axe-core scan.
