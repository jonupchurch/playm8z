# Feature Specification: Password Reset

**Feature Branch**: `033-password-reset`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Password reset (the flow behind the login form's 'Forgot password?' link)."

## Context

The login form has presented a **"Forgot password?"** link since Auth &
Onboarding (001) shipped. It has never led anywhere:
`https://www.playm8z.net/forgot-password` returns **404 in production
today**. That was deliberate, not an oversight — 001's FR-015 requires the
entry point and explicitly scopes the flow behind it to a separate
feature. This is that feature.

Two things that were blocking it are now resolved:

- **Transactional email is live** (Resend, `send.playm8z.net`, shipped
  2026-07-16). A reset flow is impossible without it, which is the deeper
  reason this waited.
- The account a reset protects is now worth protecting: a player has
  postings, applications, conversations, and forum history.

A Credentials user who forgets their password currently has **no recovery
path at all** — they click a link, hit a 404, and are locked out
permanently. Google users are unaffected: they never had a password.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regain access to my account (Priority: P1)

A player who signed up with an email and password can't remember it. From
the login form they click "Forgot password?", enter their email address,
receive a message, follow the link in it, choose a new password, and log
in.

**Why this priority**: This is the entire feature. Without it a forgotten
password is a permanently lost account, and the link promising otherwise
is already on screen in production.

**Independent Test**: Request a reset for a known Credentials account,
follow the emailed link, set a new password, and log in with it — proving
the old password no longer works.

**Acceptance Scenarios**:

1. **Given** a Credentials account exists for `player@example.com`,
   **When** the player submits that address on the reset-request screen,
   **Then** they are told a link has been sent if the address has an
   account, and a message containing a reset link arrives.
2. **Given** a valid, unexpired, unused reset link, **When** the player
   opens it and submits a new password meeting the password rules,
   **Then** the password is changed and they are told they can now log in.
3. **Given** a password was just reset, **When** the player logs in with
   the **new** password, **Then** they are signed in.
4. **Given** a password was just reset, **When** the player tries the
   **old** password, **Then** login is refused.

---

### User Story 2 - Not be told who has an account (Priority: P1)

Someone submits an address to the reset form to learn whether it's
registered.

**Why this priority**: Same priority as the happy path because it can't be
retrofitted: the moment the screen answers differently for a known and an
unknown address, the flow leaks the membership of every address anyone
cares to type. It has to be designed in from the first version.

**Independent Test**: Submit a registered address and an unregistered one;
compare the two responses — they must be indistinguishable to the person
submitting.

**Acceptance Scenarios**:

1. **Given** no account exists for `nobody@example.com`, **When** it is
   submitted, **Then** the response is identical to the one for a
   registered address, and no message is sent.
2. **Given** a Google-only account (no password) for `g@example.com`,
   **When** it is submitted, **Then** the response is identical again.

---

### User Story 3 - Be told how to get in when I never had a password (Priority: P2)

A player who signed up with Google forgets that, and asks to reset a
password they never set.

**Why this priority**: A real and likely confusion — the site offers both
sign-in methods on the same screen — and silence would leave them waiting
for a message that never comes. Lower than P1 because they aren't locked
out; they just don't realise they can already get in.

**Independent Test**: Request a reset for a Google-only account; confirm a
message arrives that points them to Google sign-in and does **not** contain
a reset link.

**Acceptance Scenarios**:

1. **Given** an account with no password (Google sign-up), **When** a reset
   is requested for it, **Then** the message they receive explains the
   account uses Google sign-in and contains no reset link.
2. **Given** that same account, **When** the reset-request screen responds,
   **Then** it says the same thing it says for every other address (see
   User Story 2).

---

### User Story 4 - Have a stolen or stale link fail closed (Priority: P2)

A reset link is old, already used, or was superseded by a newer request.

**Why this priority**: A reset link is a bearer credential for taking over
an account — anyone holding it can become that user. Its failure modes are
the security of the feature, not an edge case of it. P2 only because
User Story 1 must exist before there is a link to expire.

**Independent Test**: Attempt redemption in each state — expired, already
used, superseded, malformed — and confirm every one refuses and explains
how to start over.

**Acceptance Scenarios**:

1. **Given** a link older than its lifetime, **When** it is opened,
   **Then** the reset is refused and the player is offered a fresh request.
2. **Given** a link that was already used to set a password, **When** it is
   opened again, **Then** it is refused.
3. **Given** two reset requests for the same account, **When** the older
   link is opened, **Then** it is refused — only the newest works.
4. **Given** a made-up or truncated token, **When** it is opened, **Then**
   it is refused with the same message as any other invalid link, revealing
   nothing about why.

---

### Edge Cases

- **The address is registered but unverified.** The reset still proceeds;
  succeeding at it proves mailbox control, so the account is also marked
  verified (FR-014). Refusing would strand anyone who mistyped their
  password *and* never verified.
- **The player requests several resets in a row.** Each request invalidates
  the previous link (FR-009), so the newest message always works — the
  common "I clicked the old email" confusion resolves in the player's
  favour on the newest link, not the oldest.
- **The player is logged in on another device when the password changes.**
  Existing sessions are ended (FR-013): a reset is what someone does when
  they fear their password is known to someone else, and leaving that
  someone signed in defeats it.
- **The email fails to send.** The request still reports success (it must —
  FR-004), so the failure is invisible to the player and MUST be recorded
  where an operator can see it (FR-016).
- **The new password equals the old one.** Allowed. Detecting it would
  require comparing against the stored password, and refusing tells an
  attacker holding the link something true about the current password.
- **The link is opened while already logged in as someone else.** The reset
  applies to the account the token belongs to, never to the current
  session's account.
- **The address has an account but changed since the link was issued.** The
  link is tied to the account, not to whatever address it now has; a
  superseded address does not silently retarget the reset.

## Requirements *(mandatory)*

### Functional Requirements

**Requesting a reset**

- **FR-001**: Users MUST be able to reach a reset-request screen from the
  login form's existing "Forgot password?" link, which MUST stop returning
  a 404.
- **FR-002**: The request screen MUST accept an email address and nothing
  else.
- **FR-003**: System MUST send a reset message only to an address that has
  an account with a password set.
- **FR-004**: The request screen's response MUST be identical whether the
  address has an account, has a password-less (Google) account, or has no
  account at all — and MUST NOT reveal which. Timing differences that
  distinguish the cases SHOULD be avoided where practical.
- **FR-005**: System MUST send an account-uses-Google message, containing
  no reset link, when a reset is requested for an account with no password.
- **FR-006**: System MUST NOT send anything to an address with no account.
- **FR-007**: System MUST reuse the existing transactional-email path
  rather than introducing a second one.

**The link and its token**

- **FR-008**: A reset link MUST expire no more than **1 hour** after it is
  issued — materially shorter than the 24 hours an email-verification link
  gets, because this one can take over an account.
- **FR-009**: Issuing a reset link MUST invalidate every earlier
  outstanding link for that account.
- **FR-010**: A reset link MUST be single-use: redeeming it MUST invalidate
  it.
- **FR-011**: Reset tokens MUST NOT be interchangeable with
  email-verification tokens. A token issued for one purpose MUST NOT be
  redeemable for the other.
- **FR-012**: A reset token MUST be unguessable, and MUST NOT be readable
  from the stored data by anyone who obtains a copy of it — a stored token
  is a live credential to take over the account it belongs to.

**Completing a reset**

- **FR-013**: A successful reset MUST end that account's existing sessions.
- **FR-014**: A successful reset MUST mark the account's email verified,
  since redeeming the link proves control of the mailbox.
- **FR-015**: A new password MUST be held to the same rules as sign-up's,
  from a single shared definition — the two MUST NOT be able to disagree.
- **FR-016**: A reset message that fails to send MUST be recorded for
  operators, because the player is told it succeeded either way (FR-004).
- **FR-017**: Every reset request and every completed reset MUST be
  recorded in the existing audit trail.
- **FR-018**: All four link-failure states — expired, used, superseded,
  malformed — MUST be refused, and MUST be indistinguishable to the person
  holding the link.
- **FR-019**: Redeeming a link MUST NOT sign the player in automatically;
  they MUST log in with the new password. Holding a mailbox is grounds for
  setting a password, not for handing over a live session.

**Abuse**

- **FR-020**: System MUST limit how often reset messages are sent to the
  same address, so the flow cannot be used to flood someone's inbox.
  playm8z has **no rate-limiting infrastructure today**, so this feature
  MUST introduce whatever it needs — it is a requirement, not an
  assumption. It MUST NOT be satisfied in a way that violates FR-004 (a
  throttled request must still look identical to an un-throttled one).

### Key Entities

- **Password reset token**: a single-use, short-lived, unguessable
  credential tied to one account, that permits setting a new password. It
  is not interchangeable with an email-verification token (FR-011), it is
  never stored in a form that can be used if read (FR-012), and it is
  invalidated by expiry, use, or a newer request for the same account.
- **User** (existing): gains no new attribute. A reset changes the stored
  password, may mark the email verified, and ends the account's sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player who has forgotten their password can regain access
  in under 5 minutes without contacting anyone, using only the login screen
  and their inbox.
- **SC-002**: The "Forgot password?" link resolves to a working screen —
  0 404s from the login form.
- **SC-003**: Submitting a registered and an unregistered address produces
  responses a person cannot tell apart.
- **SC-004**: 100% of expired, used, superseded, and malformed links are
  refused; no link grants a password change outside its one-hour, one-use
  window.
- **SC-005**: After a reset, the old password fails and every prior session
  is signed out.
- **SC-006**: Repeated requests for one address stop producing messages
  beyond the documented limit, while the screen's response stays unchanged.

## Assumptions

- **Reset is for Credentials accounts only.** Google accounts have no
  password; they get an explanatory message (FR-005), not a reset.
- **The email address itself is the recovery channel**, and control of the
  mailbox is treated as sufficient proof of ownership. There is no second
  factor in this project to require, and no security question, phone
  number, or recovery code exists to fall back on.
- **No wireframe exists for these screens.** They will be designed at
  implementation time to match the existing Auth & Onboarding screens and
  `resources/guidelines.md` §4 / §4.6, rather than waiting on a design
  pass. This mirrors how email verification's own UX was handled (001).
- **Transactional email is a hard dependency and is already met** —
  Resend on `send.playm8z.net`, live since 2026-07-16.
- **Sign-up's password rules are correct as they stand** and are adopted
  unchanged (FR-015). Strengthening them is a separate decision affecting
  sign-up too.
- **A reset does not need to notify the account holder** that their
  password changed via a second "your password was changed" email. Worth
  reconsidering later; excluded here to keep the flow to one message.

## Out of Scope

- Changing a password while logged in (Profile / account settings).
- Two-factor or multi-factor authentication.
- Magic-link / passwordless login.
- Any change to Google sign-in.
- Account recovery when the player has lost access to the mailbox itself —
  that has no answer in this design and would need a support process.
