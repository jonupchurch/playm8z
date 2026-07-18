# Feature Specification: Owner-only permanent delete for news posts (+ owner title, honest "Unpublish")

**Feature Branch**: `041-owner-hard-delete-news`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "The news editor's 'Delete' button actually just unpublishes (ADR 0005). Relabel it 'Unpublish', and add an owner-only 'Delete permanently' that truly removes the post. Make 'owner' a standalone title/flag on the account, not a new role tier."

## Context *(why this feature exists)*

Nothing on this site is ever hard-deleted — content is only disabled or unpublished (a deliberate, documented policy). In the news editor that policy shows up as a red button labeled **"Delete"** that, when clicked, quietly moves the post to draft rather than removing it. The label promises destruction; the behavior is a soft unpublish. That mismatch is the bug the owner hit.

Two changes fix it. First, the misleading button is relabeled **"Unpublish"** so it says what it does — behavior unchanged. Second, the site owner (and only the owner) gets a genuine **"Delete permanently"** action that actually removes a news post, as a narrow, deliberate exception to the no-hard-delete policy.

"Owner" is modeled as a **standalone title/flag on the account, not a new role tier**. The owner keeps their normal moderation role (admin); the owner flag is an orthogonal marker that unlocks the owner-only action. This is deliberate: layering owner into the role hierarchy would mean every existing "admin or above" check had to be widened or it would silently strip the owner's access. A separate flag sidesteps that entirely — the role, and every check against it, is untouched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The owner permanently deletes a news post (Priority: P1)

The owner opens an existing news post in the editor. Alongside the normal actions, they see an owner-only **"Delete permanently"** control. Clicking it requires an explicit confirmation (the action is irreversible). On confirming, the post is removed entirely — it disappears from the public news feed, from the admin news list, and any of its likes/saves are cleaned up with it. The action is recorded in the moderator audit log. A non-owner (admin, moderator, or anyone else) never sees this control and cannot perform the action even if they try to trigger it directly.

**Why this priority**: This is the capability the owner asked for and the reason the feature exists. Independently valuable and testable.

**Independent Test**: As the owner, permanently delete a post and confirm it's gone from the feed, the admin list, and storage (with its likes/saves gone too) and that an audit entry was written. As an admin (owner flag off), confirm the control is absent and a direct attempt is refused.

**Acceptance Scenarios**:

1. **Given** the owner is editing an existing news post, **When** they click "Delete permanently" and confirm, **Then** the post is removed from the public feed, the admin news list, and storage, and an audit-log entry records the permanent deletion.
2. **Given** the owner clicks "Delete permanently", **When** they cancel the confirmation, **Then** nothing is deleted and the post is unchanged.
3. **Given** a post has likes and saves, **When** the owner permanently deletes it, **Then** those likes/saves are removed too, leaving no orphaned references.
4. **Given** an admin who is not the owner is editing a post, **When** they view the editor, **Then** no "Delete permanently" control is shown.
5. **Given** a non-owner attempts to invoke the permanent-delete action directly (bypassing the UI), **When** the server handles it, **Then** it is refused and no post is deleted.
6. **Given** a brand-new (unsaved) post, **When** the editor is shown, **Then** no "Delete permanently" control appears (there is nothing to delete yet).

---

### User Story 2 - "Delete" is relabeled to "Unpublish" (Priority: P2)

Any user who can edit news posts (moderator and above) sees the existing soft-remove button now labeled **"Unpublish"** instead of "Delete". Clicking it behaves exactly as before: the post moves to draft (leaves the public feed, keeps its row, keeps its original publish date), so it can be re-published later. The label now matches the behavior.

**Why this priority**: A small, self-contained clarity fix that removes the original confusion. Independently shippable and valuable even without US1.

**Independent Test**: Open an existing post, confirm the button reads "Unpublish", click it, and verify the post becomes a draft (off the public feed, still present in the admin list as a draft) — identical to today's "Delete" behavior.

**Acceptance Scenarios**:

1. **Given** an existing published post, **When** an editor opens it, **Then** the soft-remove button reads "Unpublish", not "Delete".
2. **Given** an editor clicks "Unpublish", **When** it completes, **Then** the post's status becomes draft, it leaves the public feed, its row and original publish date are retained, and it can be re-published.

---

### Edge Cases

- **Non-owner direct invocation**: an admin or moderator who crafts a direct request to the permanent-delete action is refused server-side; the check never relies on the button being hidden.
- **Owner flag is independent of role**: the owner keeps their normal role (admin), so every existing role-based capability is unchanged; only the extra owner-only action is added.
- **Already-deleted / missing post**: permanently deleting a post that no longer exists fails gracefully with a clear message and changes nothing.
- **Unsaved post**: the permanent-delete control does not appear for a post that hasn't been saved yet.
- **Confirmation required**: the destructive action never fires from a single click — an explicit confirm step is mandatory.
- **Audit trail**: every successful permanent delete leaves an audit-log entry (actor, action, the post it targeted); the entry persists even though the post itself is gone.
- **Owner flag defaults off**: every existing and future account has the owner flag off unless it is explicitly provisioned; no one becomes owner by accident.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support an **owner** marker on an account that is separate from the account's moderation role, defaults to off, and does not change or depend on that role.
- **FR-002**: The owner marker MUST NOT be assignable or editable through the admin UI and MUST NOT appear in role/team management; it is provisioned directly on an account.
- **FR-003**: Introducing the owner marker MUST NOT change any existing role-based access; all current "admin or above" surfaces behave exactly as before (the owner keeps them by virtue of still being an admin).
- **FR-004**: The news editor's existing soft-remove button MUST be labeled "Unpublish" (not "Delete"); its behavior (move to draft, keep the row, keep the original publish date) MUST be unchanged.
- **FR-005**: The news editor MUST show a "Delete permanently" control only to the owner, and only for an already-saved post.
- **FR-006**: Permanent deletion MUST require an explicit user confirmation before it executes.
- **FR-007**: On confirmed permanent deletion, the system MUST remove the news post entirely so it no longer appears in the public news feed or the admin news list, and MUST remove that post's associated likes/saves with no orphaned references.
- **FR-008**: The permanent-delete action MUST verify the requester carries the owner marker on the server, independently of any UI state; a non-owner request MUST be refused and delete nothing.
- **FR-009**: The permanent-delete input (which post) MUST be validated before use.
- **FR-010**: Each successful permanent deletion MUST be recorded in the moderator audit log (actor, an action describing a permanent news-post deletion, and the targeted post's identity/label), and that record MUST persist after the post is gone.
- **FR-011**: The owner marker and the owner-only permanent-delete capability MUST be recorded as an explicit, scoped exception to the no-hard-delete policy (documented decision), narrowed to: owner only, news posts only (for now), always audit-logged.
- **FR-012**: The owner account MUST be provisioned with the owner marker in both the local and production environments as part of delivering this feature, in a way that is safe to run more than once.

### Key Entities *(include if feature involves data)*

- **Account owner marker**: a per-account flag, separate from the moderation role, indicating the single site owner. Defaults to off; provisioned directly, not through any UI. Grants only the owner-only action(s); it does not alter role-based access.
- **News post**: an existing content record. This feature adds one owner-only lifecycle transition — permanent removal — distinct from the existing soft "unpublish" (move to draft). Its likes/saves are removed with it.
- **Audit-log entry**: an existing record of a moderator/admin action. A new action type records a permanent news-post deletion and outlives the deleted post.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of permanent-delete attempts by a non-owner (whether via a hidden control or a direct request) are refused and delete nothing.
- **SC-002**: After the owner permanently deletes a post, it appears in 0 of: the public news feed, the admin news list, and stored records — and 0 orphaned likes/saves remain for it.
- **SC-003**: 100% of successful permanent deletions produce exactly one audit-log entry that remains readable after the post is gone.
- **SC-004**: Introducing the owner marker causes 0 regressions to existing role-based access (every admin/moderator surface behaves exactly as before).
- **SC-005**: The soft-remove button reads "Unpublish" and its outcome (post becomes a re-publishable draft, row retained) is unchanged from the prior "Delete" behavior in 100% of cases.
- **SC-006**: No account carries the owner marker unless explicitly provisioned; the default for every account is off.

## Assumptions

- **One owner.** There is a single site owner (the operator's account). Multi-owner support, and any UI to grant/transfer ownership, are out of scope — the marker is set directly on the account.
- **Owner is orthogonal to role.** The owner keeps their normal moderation role (admin); the owner marker only adds the destructive action. This is what keeps the role system and all its checks untouched.
- **News posts only.** The owner-only hard delete applies to news posts in this feature. The same pattern could later extend to other content types, but that is not built here.
- **Permanent means permanent.** There is no recycle bin or restore; a permanently deleted post is unrecoverable by design. The audit entry is the only remaining trace.
- **The soft "Unpublish" is untouched behaviorally** — this feature only renames it and leaves the draft/no-hard-delete policy fully in force for every non-owner action.
- **A visible "Owner" badge/title is not required** for the capability. If desired later, showing the marker as a cosmetic badge is a small, separate addition; this feature only needs the marker to gate the action.

## Out of Scope

- Owner-only hard delete for any other content type (postings, forum threads/replies, users, comments) — news posts only for now; the pattern is reusable later.
- Any UI to assign, edit, or transfer the owner marker — it is provisioned directly on the account by design.
- Displaying the owner marker as a visible title/badge anywhere in the UI — cosmetic, deferred.
- Changing the no-hard-delete policy for non-owner accounts, or the behavior of the soft "Unpublish"/draft flow itself — non-owners still cannot hard-delete anything, anywhere.
- A trash/restore or recover-deleted surface — permanent deletion is irreversible on purpose.
