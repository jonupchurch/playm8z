# Phase 0 Research: Admin Settings

## 1. Extending `002`'s singleton `settings` table, not a new one

**Decision**: every new configuration value (general metadata,
moderation toggles/list/thresholds, feature flags, safety toggles)
lives as additional columns on `002`'s existing `settings` table.

**Rationale**: `002`'s own data-model.md explicitly reserved this —
"the future Admin Settings feature owns writing to it and will extend
this same table with its other toggles... rather than this feature
inventing a shape that gets replaced later." Following that plan
directly avoids a second, competing config table.

**Alternatives considered**: a separate table per section (moderation
settings, feature flags, safety) — rejected, `002`'s own singleton-row
pattern already anticipated exactly this growth, and one row is still
proportionate at this column count.

## 2. Computed auto-hide, not a stored flag

**Decision**: "auto-hide after N reports" is enforced by adding a
report-count condition to Home's/Browse's/Forum index's already-
existing `removedAt IS NULL` exclusion (their second amendment,
after Admin Users', `016`, first one) — never a stored
`autoHiddenAt`/similar flag.

**Rationale**: a stored flag would need an explicit "un-hide" action
whenever a moderator resolves the reports that triggered it (Approve,
Dismiss, or even Remove would all need to know to clear it) — a real
risk of the flag drifting out of sync with the reports that supposedly
justified it. Computing it live from the current open-report count
means resolving those reports (via any of `017`/`018`/`019`'s existing
actions) automatically and correctly changes the visibility outcome
with zero additional code in any of those actions.

**Alternatives considered**: a stored flag set at report-submission
time and cleared by each resolution action — rejected, exactly the
kind of "two places to keep in sync" this project has repeatedly
avoided (e.g., preferring computed "Flagged" over a stored boolean in
Admin Users).

## 3. Auto-flag rules read settings instead of hardcoded constants

**Decision**: the shared `src/lib/moderation/auto-flag-rules.ts`
(introduced by `017`, shared with `018`) reads
`settings.bannedPhrases` and the three filter-toggle booleans at
call time, instead of its own hardcoded list/constants.

**Rationale**: `017`'s own spec explicitly named this feature as the
place this would eventually become configurable ("this feature
intentionally hard-codes it rather than building configuration UI/
storage speculatively... a future Admin Settings page... can make
this ruleset admin-editable"). Since the ruleset already lives in one
shared place (per `018`'s own extraction), making it settings-driven
is a single, contained change that immediately and correctly affects
every consumer (`017`'s posting creation, `018`'s thread/reply
creation).

**Alternatives considered**: none seriously — this is exactly the
planned continuation of prior work, not a new design question.

## 4. Auto-escalate severity is a display badge, never an automated ban

**Decision**: Admin Postings'/Forum's/Reports' (`017`/`018`/`019`)
queue-building queries gain a computed "needs ban review" boolean
(their already-computed severity compared against
`settings.autoEscalateSeverity`), surfaced as a badge — no Server
Action ever bans anyone automatically.

**Rationale**: automated account bans are a serious, hard-to-reverse-
in-spirit action (even though ADR 0005 keeps banning itself
reversible via unban, a WRONG automated ban still causes real harm in
the meantime) — a human moderator should always be the one who
actually decides to ban. A visual escalation hint captures the
wireframe's intent ("auto-escalate to ban review") without crossing
into "the system bans people on its own."

**Alternatives considered**: automatically banning at the threshold —
rejected outright as a safety-critical overreach beyond what any
prior feature in this project has done; a notification to moderators
instead of a badge — rejected as unnecessary given the queue itself is
already where moderators look.

## 5. Roles & access — a bounded 4-tier extension

**Decision**: `user.role` grows from `moderator`\|`admin` to also
allow `support`\|`viewer` (both below `moderator`). Every existing
`require-role.ts('moderator')` call is unchanged and continues to deny
both new values identically to a plain `user`. No feature builds
differentiated `support`/`viewer` permissions in this pass.

**Rationale**: the wireframe's own role dropdown offers exactly these
four values — introducing them as assignable is this feature's real
job ("Roles & access"), but retrofitting every existing admin
feature's gate to treat `support` differently from `viewer` (or from
a denied plain user) would require a permissions-matrix design this
feature was never asked to produce, and no existing feature's spec
anticipated needing one. Shipping the assignable values now, with
differentiated behavior as each admin feature's own later addition
(same as `logAuditEntry()`/`createNotification()`'s "define now, adopt
later" pattern), is the proportionate scope.

**Alternatives considered**: building out real permission differences
for `support`/`viewer` now (e.g., Support can view queues but not
resolve them) — rejected as speculative scope expansion across many
already-merged features, well beyond what this feature's own
wireframe or any prior spec called for.

## 6. "Invite a team member" assigns an existing account directly

**Decision**: `assign-team-role.ts` looks up the entered email against
existing `user` rows; if found, sets that user's `role` directly; if
not found, returns a clear "no account found — they need to sign up
first" message. No invite-token/pending-invite entity is created.

**Rationale**: a full email-invitation system (tokens, expiry, an
acceptance page) is meaningfully more infrastructure than this
feature's own scope calls for, and the wireframe itself shows no
distinct "pending invite" state in its team list (every seeded member
already has a role) — direct assignment against an existing account is
the simplest mechanism that satisfies "grant someone on the team a
role."

**Alternatives considered**: a real invite-token flow with its own
acceptance page — rejected as disproportionate; silently no-op'ing on
an unmatched email — rejected, an admin needs to know why nothing
happened.

## 7. Real gap found and fixed: Public Profile never honored `007`'s privacy toggles

**Decision**: a small, bounded retroactive amendment to Public
Profile's (`022`) sidebar component, conditionally omitting the
Region/Age-group fields based on the viewed user's `showRegion`/
`showAgeGroup` (`007`) preferences.

**Rationale**: `007`'s own spec explicitly deferred consuming these
toggles to "the feature that actually renders a public-facing profile"
— that feature (`022`) has since shipped without ever reading them, an
oversight only surfaced while researching this feature's own
"Discoverable profiles by default" setting. Fixing it now, while the
context is fresh, is the same "catch and fix a cross-feature gap
immediately" discipline this project has applied repeatedly (Admin
Users' `removedAt` exclusions, Admin Forum's `reason-severity.ts`
correction).

**Alternatives considered**: leaving it for a future pass — rejected;
the gap is now known, the fix is small (a conditional render), and
this project's own established practice is to close such gaps as soon
as they're found, not defer a known correctness issue.

## 8. Feature flags — one real, five inert

**Decision**: "Open signups" gets a real bounded amendment to Auth &
Onboarding's (`001`) sign-up path (reject new sign-ups when false,
existing logins unaffected). Discord integration, Groups & clans,
Player ratings, Community forum, and Tabletop & TTRPG filters are
stored and toggleable but consulted by nothing.

**Rationale**: unlike the moderation-rule flags (which have a single,
already-shared, already-designed-for-this consumer), these five each
name either an entirely unbuilt feature (Discord, Groups, Ratings) or
an already-shipped one with no existing "is this feature enabled"
check anywhere in its own code (Forum, Tabletop filters within
Browse) — wiring all five in for real would mean touching that many
more already-merged features' files for behavior none of them were
ever specified to need. "Open signups" is the one flag with an
obvious, single, cheap, unambiguous real consumer.

**Alternatives considered**: wiring all six for real — rejected as
scope creep well beyond this feature's own bounded "ship the settings
UI" job; wiring none for real (all six inert) — rejected, "Open
signups" specifically has real, immediate value (a genuine
operational lever an admin would want, e.g. during an incident) and
costs almost nothing to wire.
