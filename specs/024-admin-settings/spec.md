# Feature Specification: Admin Settings

**Feature Branch**: `024-admin-settings`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Admin Settings at `/admin/settings`. Source of truth: resources/wireframes/admin/playm8z - Admin Settings.dc.html and resources/guidelines.md section 8 (referenced) / docs/feature-list.md item 24. Five sections via a left section-nav: General (site name/tagline/support email/default theme, maintenance mode), Moderation & auto-flag (filter toggles, banned phrases list, auto-hide-after-N-reports threshold, auto-escalate severity), Roles & access (team list with role dropdown, remove, invite-by-email), Feature flags (toggles), Safety (minimum signup age, verification/discoverability/auto-hide toggles). Gated at admin (not just moderator) given its sensitivity -- the wireframe's own 'owner' sidebar label is dropped as flavor text, same normalization as Admin News'/Admin Content Pages' 'editor.'

This feature is what Error Pages' (002) `settings` table was explicitly built for: its own data-model.md says 'the future Admin Settings feature owns writing to it and will extend this same table with its other toggles... rather than this feature inventing a shape that gets replaced later,' and that logging a maintenance-mode change to the audit log is 'that feature's concern, not this one's.' This feature is also what Admin Postings' (017) and Admin Forum's (018) own specs anticipated for making their hardcoded auto-flag ruleset admin-editable, and what Public Profile's (022)/Profile's (007) privacy toggles were waiting to be given a platform-wide default for.

Reconciliations against already-established decisions (this feature required more reconciliation than any prior one -- it directly touches ADR 0002, and reveals a real gap in Public Profile, 022):
- The wireframe's 'Minimum age to sign up' control (13+/16+/18+) is DROPPED ENTIRELY -- ADR 0002 fixes the platform's minimum signup age at 18+ as a hardcoded, non-configurable rule, not an admin-adjustable setting; exposing a 13+/16+ option here would directly undermine that ADR. 'Require email verification' is also dropped -- it's already a hardcoded, non-optional requirement (`require-verified-email.ts` gates nearly every write action platform-wide), not something with a real 'off' state to expose. 'Sync blocklists across devices' is dropped -- blocks (008) are already server-stored and inherently synced everywhere; there is no per-device/offline concept anywhere in this project for this toggle to mean anything.
- 'Discoverable profiles by default' (Safety) and 'Auto-hide reported content' (Safety) are NOT independent of Profile's (007) already-existing privacy toggles and this feature's own Moderation-section auto-hide threshold, respectively -- see below.
- REAL GAP FOUND AND FIXED: Profile's (007) spec already introduced four per-user privacy toggles (show age group, show region, show online status, discoverable profile), explicitly stating 'this feature only stores the preference... the feature that actually renders a public-facing profile (Public Profile) is what will honor them.' Public Profile (022) has since been spec'd and merged -- but never actually wired this up, unconditionally showing region/age-group regardless of the viewed user's own preference. This feature includes a small, bounded retroactive amendment to Public Profile's (022) sidebar, honoring `showRegion`/`showAgeGroup` (hiding the respective field when off). `showOnlineStatus` and `discoverable` remain without a real consumer (022 already dropped the online indicator entirely per established precedent, and no profile-search/directory feature exists yet to consult `discoverable`) -- both stay stored-but-inert, same as before, now just correctly scoped as 'still no consumer' rather than silently unconsumed by an oversight.
- This feature's own 'Discoverable profiles by default' (Safety) sets the DEFAULT value written to `007`'s per-user `discoverable` field at account creation -- a small, bounded amendment to Auth & Onboarding's (001) account-creation path, reading this platform default instead of a hardcoded one. It has no further effect beyond that default until a future discovery/search feature exists to consult `discoverable` itself.
- 'Auto-hide reported content' (Safety, on/off) and 'Auto-hide after N reports' (Moderation, the threshold) are the SAME mechanism, not two -- one enable switch plus one number, both stored together. Implemented as a COMPUTED visibility rule (not a stored 'hidden' flag): a small, bounded second amendment to Home's (003)/Browse's (004)/Forum index's (009) already-once-amended (by Admin Users, 016) queries, additionally excluding a row whose current open-report count meets or exceeds the threshold, when the enable switch is on. Because it's computed from live report counts (not a stored flag), a moderator resolving those reports (Admin Postings/Forum/Reports' own Approve/Remove/Dismiss) automatically and correctly un-hides or confirms removal -- no separate 'un-hide' action needed anywhere.
- The Moderation section's filter toggles (banned-phrase/external-link/boosting-keyword/new-account-review) and banned-phrases list are NOT decorative -- they're real, admin-editable configuration for the shared `auto-flag-rules.ts` helper Admin Postings (017) introduced and Admin Forum (018) already extracted to share. A bounded amendment makes that helper read these settings (banned-phrase list, and whether each of its three checks is enabled) instead of its own hardcoded constants -- exactly what `017`'s own spec anticipated ('a future Admin Settings page for configuring... auto-flag rules... this feature intentionally hard-codes it rather than building configuration UI/storage speculatively').
- 'Auto-escalate to ban review at severity' is a DISPLAY hint, never an automated ban -- items in Admin Postings'/Forum's/Reports' (017/018/019) queues whose already-computed severity (via the shared `reason-severity.ts`/auto-flag severity mapping) meets or exceeds this threshold get an additional visual 'needs ban review' badge in those queues. No account is ever banned automatically; a moderator still makes every ban decision.
- 'Roles & access' expands `user.role` from the current 2-tier admin model (`moderator` | `admin`, both already used by every existing `require-role.ts` gate) to 4 tiers: `user` (renamed conceptually as the base/no-admin-access tier) is unaffected; two NEW admin-side values, `support` and `viewer`, are introduced below `moderator`. Every EXISTING `require-role.ts('moderator')` gate is unaffected -- `support`/`viewer` are both still denied by it, identical to a plain `user`, since no feature has ever needed to differentiate them further. This feature only ships the ASSIGNABLE role values and the team-management UI; building actual differentiated permissions for `support`/`viewer` (e.g., letting Support view but not act on a queue) is each respective admin feature's own future follow-up, logged to `docs/future-work.md` -- the same 'ship the mechanism, adopt it later' pattern already used for `createNotification()`/`logAuditEntry()`.
- 'Invite a team member' does NOT build a new invite-token/pending-invite system -- it looks up an EXISTING user by email and assigns the chosen role directly; if no account exists yet for that email, it shows a clear message that they need to sign up first. This is a deliberately bounded scope choice over building a parallel email-invitation/acceptance flow.
- 'General' section's site name/tagline/support email/default theme are stored (a real, working settings form) but have NO current consumer -- the nav bar/footer/theming are all Design System infrastructure, out of every feature's own scope, same as every prior feature's own disclaimer; wiring them up is each respective Design System component's own future concern.
- 'Feature flags': only 'Open signups' gets real enforcement (a bounded amendment to Auth & Onboarding's, 001, sign-up path, rejecting new sign-ups with a clear message when off; existing users can still log in). Discord integration, Groups & clans, Player ratings, Community forum, and Tabletop & TTRPG filters are all stored, toggleable, but INERT -- none of those features currently check a flag before doing their thing, and wiring five already-merged features to consult a flag is out of this feature's own bounded scope; each remains available exactly as already built regardless of this toggle's value, logged to `docs/future-work.md`.
- Every settings change (any section) logs an audit entry via `logAuditEntry()` (Admin Dashboard, 015) -- exactly what `002`'s own spec said would eventually happen ('when Admin Settings adds its own toggle UI, logging that change to the moderation audit log is that feature's concern')."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin configures general settings and maintenance mode (Priority: P1)

An admin (not just moderator) updates general site metadata and flips maintenance mode on or off, taking the public site offline (admins keep access) or restoring it.

**Why this priority**: Maintenance mode is the single most consequential, most-anticipated control this feature ships — `002` shipped the underlying field specifically waiting for this real toggle.

**Independent Test**: Toggle maintenance mode on, confirm a non-admin visitor now sees the maintenance page (`002`) while an admin session still has full access; toggle it off and confirm normal access resumes. Separately, edit the general fields and confirm they persist.

**Acceptance Scenarios**:

1. **Given** an admin session, **When** they toggle maintenance mode on and save, **Then** `002`'s existing `settings.maintenanceMode` becomes true, a non-admin visitor to any non-admin route now sees the maintenance page, and an admin session is unaffected.
2. **Given** maintenance mode is on, **When** an admin toggles it off and saves, **Then** normal public access resumes immediately.
3. **Given** the General section, **When** an admin edits site name/tagline/support email/default theme and saves, **Then** the values persist (no current page reads them yet — see Assumptions).
4. **Given** a moderator (not admin) session, **When** they attempt to view this page, **Then** they're denied per Error Pages' access-denied behavior (this page requires admin, not just moderator).
5. **Given** any settings save in this section, **When** it completes, **Then** an audit entry is recorded.

---

### User Story 2 - Admin configures moderation and auto-flag rules (Priority: P2)

An admin enables/disables each auto-flag filter, edits the banned-phrases list, sets the auto-hide-after-N-reports threshold, and sets the auto-escalate severity threshold — all of which take real effect in the existing moderation queues and public content queries.

**Why this priority**: Turns Admin Postings'/Admin Forum's (017/018) previously-hardcoded auto-flag ruleset into something an admin can actually tune, and closes the loop those features' own specs anticipated — but it's secondary to General/maintenance mode's more foundational reach.

**Independent Test**: Add a banned phrase and confirm a new posting/thread matching it gets auto-flagged; disable the boosting-keyword filter and confirm a new posting matching only that pattern no longer gets flagged; set the auto-hide threshold to 2 and confirm a posting with 2 open reports is hidden from Home/Browse without any moderator action, then confirm resolving those reports un-hides it automatically.

**Acceptance Scenarios**:

1. **Given** the banned-phrases list, **When** an admin adds or removes a phrase and saves, **Then** the shared `auto-flag-rules.ts` helper (`017`/`018`) uses the updated list for every subsequently-created posting/thread/reply.
2. **Given** a filter toggle (banned-phrase/external-link/boosting-keyword/new-account-review) is turned off, **When** new content is created matching only that check, **Then** it is NOT auto-flagged.
3. **Given** the auto-hide switch is on and the threshold is N, **When** a posting/thread/reply accumulates N or more currently-open reports, **Then** it's excluded from Home's/Browse's/Forum index's public queries (computed, no stored flag) without any moderator action.
4. **Given** a moderator resolves (Approve/Remove/Dismiss) enough of those reports to drop the open count below N, **When** the query re-evaluates, **Then** the item automatically becomes visible again (if not separately removed) — no manual "un-hide" action exists or is needed.
5. **Given** the auto-escalate severity threshold, **When** a queue item's already-computed severity meets or exceeds it, **Then** Admin Postings'/Forum's/Reports' (`017`/`018`/`019`) queues show an additional "needs ban review" badge — no account is ever banned automatically.

---

### User Story 3 - Admin manages team roles, feature flags, and remaining safety settings (Priority: P3)

An admin assigns/changes/removes team members' roles, invites an existing user by email to a role, toggles feature flags, and sets the discoverable-by-default safety setting.

**Why this priority**: Team/role management and feature flags are exercised far less often than the moderation-tuning and maintenance-mode controls (US1/US2) — typically set up once and rarely revisited.

**Independent Test**: Change a team member's role and confirm their access changes accordingly (moderator gains queue access, demoting to `user` revokes it); invite an existing user by email and confirm their role updates; invite a nonexistent email and confirm a clear "no account found" message; toggle "Open signups" off and confirm new sign-ups are rejected while existing logins still work; toggle "Discoverable profiles by default" and confirm a newly-created account's `discoverable` preference matches it.

**Acceptance Scenarios**:

1. **Given** the team list, **When** an admin changes a member's role (`viewer`/`support`/`moderator`/`admin`), **Then** it persists and takes effect on their next `require-role.ts` check; setting it to `admin` grants full access, `moderator` grants existing moderator-gated access, `support`/`viewer` grant neither more nor less than a plain user today (no differentiated permissions exist yet for them).
2. **Given** the team list, **When** an admin removes a member, **Then** their role reverts to the base `user` tier (never a ban, never account deletion, ADR 0005-consistent).
3. **Given** "Invite a team member," **When** an admin enters an email belonging to an existing account and selects a role, **Then** that account's role is set directly (no separate invite-token flow); **When** the email matches no existing account, **Then** a clear message explains they must sign up first.
4. **Given** "Open signups" is toggled off, **When** a new visitor attempts to sign up, **Then** they're rejected with a clear message; existing users can still log in normally.
5. **Given** "Discoverable profiles by default" is toggled, **When** a new user completes account creation, **Then** their own `discoverable` preference (`007`) initializes to that platform default.
6. **Given** any other feature flag (Discord/Groups/Ratings/Forum/Tabletop), **When** toggled, **Then** it persists but has no observable effect on the already-built feature it names (logged as future-work).
7. **Given** any settings save in this section, **When** it completes, **Then** an audit entry is recorded (role changes specifically as `category = 'access'`).

---

### Edge Cases

- What happens to the wireframe's 13+/16+/18+ minimum-age control? → Dropped entirely; ADR 0002 fixes this at 18+, non-configurable (see Input).
- What happens to "Require email verification" and "Sync blocklists across devices"? → Both dropped — the former is already a hardcoded platform requirement, the latter presupposes a per-device concept this project doesn't have.
- What happens to Public Profile's (`022`) previously-unwired privacy toggles? → A bounded retroactive fix makes it honor `showRegion`/`showAgeGroup` (see Input) — a real gap found and closed during this feature's own design.
- What happens when an admin demotes the only remaining admin (including possibly themselves)? → Not specially prevented — this feature doesn't add a "must always have at least one admin" guard; if the platform ends up with zero admins, direct database access is the recovery path, same category of manual-recovery already accepted for `002`'s pre-this-feature maintenance-mode toggle.
- What happens to `support`/`viewer` roles today? → Assignable, persisted, but functionally identical to a plain `user` at every existing gate — no feature currently differentiates them (see Input).
- What happens to a posting/thread auto-hidden by the report threshold if its reports are dismissed rather than resolved? → Same computed rule — dismissing (via Admin Reports, `019`) also reduces the open-report count, so the item becomes visible again the same way resolving/removing does.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require role = admin (stricter than every other `/admin/*` page's moderator minimum) to view or act on this page; a visitor without that access MUST be denied.
- **FR-002**: System MUST let an admin edit general site metadata (site name, tagline, support email, default theme) and persist it.
- **FR-003**: System MUST let an admin toggle maintenance mode (and an optional message), taking real effect via `002`'s existing `settings.maintenanceMode`/`maintenanceMessage` fields and enforcement path.
- **FR-004**: System MUST let an admin toggle each of the four auto-flag filter checks and manage the banned-phrases list, with real effect on the shared `auto-flag-rules.ts` helper (`017`/`018`).
- **FR-005**: System MUST let an admin set an auto-hide-after-N-reports threshold (with an enable/disable switch) that computedly excludes a sufficiently-reported posting/thread/reply from Home's/Browse's/Forum index's public queries, re-evaluated live (no stored "hidden" flag).
- **FR-006**: System MUST let an admin set an auto-escalate severity threshold that adds a "needs ban review" display badge to Admin Postings'/Forum's/Reports' queues — never an automated ban.
- **FR-007**: System MUST let an admin view every team member (role ≥ some admin-side value) with their current role, change it (`viewer`/`support`/`moderator`/`admin`), or remove them (reverting to the base `user` role, never a ban or deletion).
- **FR-008**: System MUST let an admin assign a role to an existing user by email ("Invite a team member"); an email matching no existing account MUST show a clear message rather than silently failing or creating a phantom invite.
- **FR-009**: System MUST let an admin toggle "Open signups," with real effect rejecting new sign-ups (existing logins unaffected) when off.
- **FR-010**: System MUST let an admin toggle the remaining feature flags (Discord/Groups/Ratings/Forum/Tabletop) and persist them, with no requirement that any already-built feature currently consult them.
- **FR-011**: System MUST let an admin toggle "Discoverable profiles by default," with real effect initializing new users' own `discoverable` preference (`007`) at account creation.
- **FR-012**: System MUST record an audit entry (`logAuditEntry()`) for every settings save in every section.
- **FR-013**: This feature MUST include a small, bounded retroactive amendment to Public Profile's (`022`) sidebar, honoring the viewed user's `showRegion`/`showAgeGroup` privacy preferences (`007`) — a real gap found during this feature's own design.

### Key Entities

- **Settings**: Extends `002-error-pages`'s existing singleton table with: `siteName`, `tagline`, `supportEmail`, `defaultTheme`, four moderation filter-toggle booleans, `bannedPhrases` (text array), `autoHideEnabled` (boolean), `autoHideThreshold` (integer), `autoEscalateSeverity` (`low`\|`med`\|`high`), five feature-flag booleans, `openSignups` (boolean), `discoverableByDefault` (boolean).
- **User**: `role` extended from `moderator`\|`admin` to also allow `support`\|`viewer` (both below `moderator` for every existing gate) — no other change.
- **AuditEntry**: Reused (`015`) — this feature is another real writer, across every section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of maintenance-mode toggles take effect immediately for non-admin visitors, with admin access unaffected throughout.
- **SC-002**: 100% of banned-phrase/filter-toggle changes affect subsequently-created content's auto-flagging, using the shared helper, not a duplicated copy.
- **SC-003**: 100% of content meeting the live auto-hide threshold is excluded from public queries, and automatically restored once its open-report count drops back below threshold — no stored flag ever needs manual clearing.
- **SC-004**: 100% of role changes take effect on the affected user's next admin-gated request.
- **SC-005**: 100% of visitors without admin access are denied, never shown this page's content, even if they have moderator access elsewhere.
- **SC-006**: 100% of settings saves (every section) produce exactly one audit entry.

## Assumptions

- The admin sidebar shell is Design System infrastructure, out of this feature's own scope, same as every prior admin feature. The sidebar's "owner" role label is demo flavor text, not a ratified distinct role.
- General section fields (site name/tagline/support email/default theme) have no current reader — the nav bar/footer/theming remain Design System infrastructure outside every feature's scope; wiring them up is a future concern for whichever feature eventually makes that infrastructure configurable.
- `support`/`viewer` are real, assignable role values with no differentiated permissions built yet beyond "not moderator, not admin" — building that out is each respective admin feature's own future follow-up, logged to `docs/future-work.md`.
- "Invite a team member" requires an existing account — this feature doesn't build a parallel invite-token/acceptance system.
- Only "Open signups" and "Discoverable profiles by default" get real enforcement among the flags/safety toggles that don't already have one; the remaining five feature flags are stored but inert, logged to `docs/future-work.md`.
- The bounded retroactive fix to Public Profile (`022`) only covers `showRegion`/`showAgeGroup` — `showOnlineStatus` (no online indicator exists to show/hide, per `022`'s own established drop) and `discoverable` (no discovery/search feature exists yet to consult it) remain without a real consumer, same as before this feature, just now correctly understood as "still waiting," not "silently missed."
- This feature doesn't guard against removing the platform's last admin — manual database recovery is the accepted path, consistent with how `002`'s own pre-this-feature maintenance toggle was handled.
