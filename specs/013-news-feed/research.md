# Phase 0 Research: News feed

## 1. Server-side, URL-driven filtering and pagination

**Decision**: category, search, and page state live in `searchParams`,
driving a real paginated Drizzle query — Browse's and Forum index's
already-settled pattern, not Home's client-side approach.

**Rationale**: news posts accumulate indefinitely over the site's
lifetime, the same scaling argument already made twice; reusing the
pattern keeps this feature consistent with how the project handles any
list that grows without bound.

**Alternatives considered**: none new — directly follows existing
precedent.

## 2. Minimal `newsPosts` shape, extended later by Admin News

**Decision**: this feature defines only the columns its own read-only
UI needs (`title`, `excerpt`, `category`, `cover`, `readTimeMinutes`,
`featured`, `upcoming`, `publishedAt`) — no `body`/full-content column,
since this feature never renders a full article (that's the separate,
already-spec'd News article detail feature, `#23` on `docs/feature-
list.md`) or builds an editor (Admin News, not yet spec'd).

**Rationale**: identical reasoning to Home defining a minimal
`postings` shape before Post a Game existed to extend it — whichever
feature needs a shared entity first defines just what it needs.

**Alternatives considered**: building the full documented `NewsPost`
shape (including body content) now — rejected, this feature has
nothing to do with a full column it would never populate or read.

## 3. Subscribing requires no authentication

**Decision**: `subscribe-newsletter.ts` has no session check at all —
just Zod validation of the email format and a database-level unique
constraint on `newsletterSubscribers.email` to prevent duplicates.

**Rationale**: this is the first write action in the project that
isn't tied to a user account — a marketing email-capture form
functions the same way whether or not the visitor is logged in, and
gating it behind authentication would contradict the wireframe's own
intent (anyone, anywhere, can type an email here).

**Alternatives considered**: requiring login to subscribe — rejected,
contradicts the feature's own purpose and the wireframe's design;
an application-level "already exists" check instead of a database
constraint — rejected, same race-condition reasoning already applied
to Forum Thread's `likes` table (Principle II).

## 4. No real newsletter delivery

**Decision**: `newsletterSubscribers` stores email addresses only;
nothing in this feature sends anything.

**Rationale**: matches Forum Thread's `ThreadSubscription` precedent
(store the preference, no delivery mechanism) and is blocked on the
same domain-ownership issue already logged against Auth & Onboarding's
transactional email — building a second, unrelated email-sending path
before that's resolved would be premature.

**Alternatives considered**: wiring up Resend now for this specific
use case — rejected, the underlying blocker (no owned domain) applies
identically here and isn't resolved by building this feature.
