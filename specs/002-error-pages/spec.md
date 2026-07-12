# Feature Specification: Error Pages

**Feature Branch**: `002-error-pages`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Error Pages feature for playm8z: branded 404 (not found), 500 (server error), 403 (access denied), and maintenance states, replacing framework-default or blank error screens. Source of truth: resources/wireframes/support/playm8z - Error Pages.dc.html and resources/guidelines.md section 12.5. All four states share one visual layout (logo, 'disconnected pawns' motif, big status code, title, message, two actions, footnote); the wireframe's top-right state switcher is a design-review aid only — production always renders the state matching the real condition (missing route, unhandled error, insufficient access, or maintenance-mode flag), never a manually-chosen one. Maintenance ties to a maintenance-mode toggle that belongs to the not-yet-spec'd Admin Settings feature; this feature only needs to consume that flag's value, not design where it's stored or its toggle UI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor hits a broken or missing link (Priority: P1)

A visitor follows a stale link, mistypes a URL, or opens a link to content that's been removed, and lands on a branded "not found" page instead of a blank screen or the framework's default error page.

**Why this priority**: This is by far the most frequently hit of the four states — broken links, typos, and removed content happen constantly, and every other page on the site can be the target of a bad link.

**Independent Test**: Navigate to any route that doesn't exist and confirm the branded 404 page renders, with working links back to Home and to Browse.

**Acceptance Scenarios**:

1. **Given** any visitor (logged in or not), **When** they request a route that doesn't exist anywhere on the site, **Then** they see the branded "not found" page with a link to Home and a link to Browse.
2. **Given** a visitor on the 404 page, **When** they click either action, **Then** they land on a working page (Home or Browse), not another error.

---

### User Story 2 - Unhandled server error occurs (Priority: P2)

While a user is doing something ordinary (viewing a page, submitting a form), the server hits an unexpected error, and instead of a blank white screen, a raw stack trace, or a silent hang, the user sees a branded "something broke" page with a way to retry and a reference code to share with support.

**Why this priority**: Second most disruptive — this is the moment a user might conclude the whole site is broken and leave; a clear, on-brand response with a next step (and a support-friendly reference) matters more than any polish item, but it's rarer than a plain missing page.

**Independent Test**: Trigger an unhandled server error on any request and confirm the branded 500 page renders with a "try again" action, a link back to Home, and a visible reference code — never a raw error/stack trace or blank page.

**Acceptance Scenarios**:

1. **Given** any visitor, **When** an unhandled error occurs while the server is handling their request, **Then** they see the branded "server error" page with a "try again" action, a link back to Home, and a short reference code.
2. **Given** a user on the 500 page, **When** they click "try again", **Then** the original request is retried (not silently ignored).
3. **Given** the 500 page is shown, **When** it renders, **Then** no internal error detail (stack trace, file path, query text, etc.) is exposed to the user.

---

### User Story 3 - Visitor without sufficient access hits a gated page (Priority: P3)

A visitor who isn't logged in, or is logged in but lacks the required role, follows a link to a page that needs authentication or a higher permission level (most commonly an `/admin/*` page), and sees a branded "access denied" page offering to log in or head back, instead of a confusing redirect or a raw framework error.

**Why this priority**: Happens less often than a missing page or a server hiccup, but matters for anyone who's been sent an admin/moderator link, or whose session expired mid-visit.

**Independent Test**: As a logged-out visitor, request an authenticated-only route; as a logged-in non-moderator, request an `/admin/*` route; confirm both show the branded 403 page, the first offering "Log in" and both offering "Back to home".

**Acceptance Scenarios**:

1. **Given** a visitor who is not logged in, **When** they request a route that requires authentication, **Then** they see the branded "access denied" page with a "Log in" action and a "Back to home" action.
2. **Given** a visitor who is logged in but does not hold the required role, **When** they request a route restricted to a higher role (e.g., any `/admin/*` page, which requires moderator or higher), **Then** they see the same branded "access denied" page.
3. **Given** an unauthorized visitor requests any `/admin/*` path, **When** the system checks access, **Then** the access check happens before route existence is considered, so a nonexistent `/admin/*` path shown to an unauthorized visitor still renders 403, not 404 — an unauthorized visitor cannot use the response to learn whether a given admin route exists.

---

### User Story 4 - Platform is placed into maintenance mode (Priority: P4)

An admin has enabled a platform-wide maintenance flag (via the future Admin Settings feature) ahead of planned upgrade work. Every ordinary visitor who requests any non-admin page during that window sees a branded "down for maintenance" page instead of the app, while an admin/moderator can still reach `/admin` to turn maintenance mode back off.

**Why this priority**: Least frequently exercised of the four (it's a deliberate, planned state rather than something that happens to a visitor unexpectedly), and it depends on a flag this feature doesn't itself create — but it still needs its own defined page and behavior.

**Independent Test**: With the maintenance flag set to "on," confirm every non-admin route renders the branded maintenance page while `/admin/*` remains reachable for a moderator-or-higher session.

**Acceptance Scenarios**:

1. **Given** the maintenance flag is enabled, **When** any visitor requests any route outside `/admin/*`, **Then** they see the branded "down for maintenance" page instead of that route's normal content.
2. **Given** the maintenance flag is enabled, **When** a user holding moderator role or higher requests any `/admin/*` route, **Then** the admin area still renders normally (not the maintenance page), so the flag can be turned back off.
3. **Given** an optional estimated-return message has been configured, **When** the maintenance page renders, **Then** that message is shown; **Given** none has been configured, **When** the maintenance page renders, **Then** a generic "back shortly" message is shown instead.

---

### Edge Cases

- What happens if the maintenance flag is enabled while a visitor already has a page open in their browser? → Not pushed live to an open tab; the maintenance page appears the next time that visitor navigates or the page makes a fresh request.
- What happens if an error occurs while the system is still determining which of these four states even applies (e.g., the access check itself throws)? → Falls back to the 500 state — an unhandled error always takes precedence over a state the system couldn't successfully determine.
- What happens to an unrecognized route under `/admin/*` for a visitor who **is** authorized as moderator or higher? → Renders 404, same as an unrecognized route anywhere else on the site (see User Story 3's Acceptance Scenario 3 for the unauthorized case, which differs).
- What happens when the 500 page's reference code needs to be looked up? → Out of scope for this feature: the code only needs to be unique enough to correlate a user report with server-side logs; building a lookup/search tool for support staff is not part of this spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a branded "not found" page for any request to a route that does not exist, offering a link to Home and a link to Browse.
- **FR-002**: The "not found" response MUST carry an actual not-found (404) status on the wire, not a success status with error-looking content.
- **FR-003**: System MUST render a branded "server error" page when an unhandled error occurs while serving a request, offering a "try again" action and a link back to Home.
- **FR-004**: Every "server error" page MUST display a short reference code unique enough to correlate a user's report with server-side records, without exposing internal error details (stack traces, file paths, query text) to the user.
- **FR-005**: The "server error" response MUST carry an actual server-error (500) status on the wire.
- **FR-006**: System MUST render a branded "access denied" page when a visitor requests a route that requires authentication they don't have, or a role/permission level higher than theirs, offering a "Log in" action and a "Back to home" action.
- **FR-007**: The access check for a role- or auth-gated route MUST be evaluated before that route's existence is considered, so an unauthorized visitor sees "access denied" rather than "not found" for both real and nonexistent paths under a gated area (e.g., `/admin/*`) — this prevents an unauthorized visitor from using the response to learn what does or doesn't exist there.
- **FR-008**: The "access denied" response MUST carry an actual access-denied (403) status on the wire.
- **FR-009**: System MUST support a platform-wide maintenance flag (owned and toggled by the future Admin Settings feature — this feature only reads its current value) that, when enabled, renders a branded "down for maintenance" page for every route except `/admin/*`.
- **FR-010**: While the maintenance flag is enabled, `/admin/*` routes MUST remain reachable for a session holding moderator role or higher, so maintenance mode can be disabled again.
- **FR-011**: The maintenance page MUST display an optional estimated-return message when one has been configured, and a generic "back shortly" message when none has been configured.
- **FR-012**: The maintenance response MUST carry a service-unavailable (503) status on the wire, distinct from the server-error (500) status.
- **FR-013**: All four states (not-found, server-error, access-denied, maintenance) MUST share the same visual layout (logo, motif, status code, title, message, two actions, footnote), differing only in their content, per the source wireframe.
- **FR-014**: The manual state-switcher control shown in the source wireframe MUST NOT appear in the shipped product — the state shown MUST always be the one matching the real condition (missing route, unhandled error, insufficient access, or the maintenance flag), never a visitor- or developer-selectable choice.

### Key Entities

- **Maintenance flag**: A platform-wide boolean setting (plus an optional estimated-return message) that governs whether the maintenance page renders. Its storage and toggle UI belong to the future Admin Settings feature; this feature only specifies that the flag exists and what reading it as "on" does.
- **Error reference code**: An opaque, short identifier generated per server-error occurrence and shown to the user. Not a stored entity this feature manages beyond generating and displaying it — how (or whether) it's persisted server-side for correlation is an implementation detail, not fixed here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of requests to a nonexistent route render the branded not-found page with an actual not-found status, never a blank page or a framework default.
- **SC-002**: 100% of unhandled server errors render the branded server-error page with a reference code, never a raw stack trace or blank page.
- **SC-003**: 100% of requests to an auth- or role-gated route the visitor doesn't qualify for render the branded access-denied page with a working "Log in" or "Back to home" path.
- **SC-004**: While the maintenance flag is enabled, 100% of non-admin routes render the maintenance page, and `/admin/*` remains reachable for moderator-or-higher sessions.
- **SC-005**: From any of the four states, a visitor can reach a working next step (Home, Browse, Log in, or Retry) in a single click — no dead ends.

## Assumptions

- A single "access denied" state covers both "not logged in" and "logged in but insufficient role," matching the source wireframe's single page (whose copy offers "Log in" as the primary action either way) — this feature does not build a separate "please log in" experience distinct from 403.
- The maintenance flag's storage and toggle UI are fully owned by the future Admin Settings feature (`resources/guidelines.md` §12.6); this feature only specifies that such a flag exists and what it does when read as "on."
- Automated error monitoring/alerting (e.g., paging a team when server errors spike) is out of scope — only the user-facing page and a correlatable reference code are covered here.
- Content-privacy-driven restrictions (a private profile, a blocked user's content) are a different concern, handled by their own features (Public Profile, Blocked Users), not the route-level access check this feature covers.
- Neither 403 nor 500 has a dedicated URL in `resources/sitemap.md` (unlike 404 and `/maintenance`), since both render contextually wherever the triggering condition occurs rather than being navigated to directly — consistent with the sitemap.
- During maintenance mode, a moderator-or-higher session sees the maintenance page on any route outside `/admin/*`, the same as any other visitor — the exemption is scoped to the admin area itself, not to the admin's identity everywhere on the site.
