# Feature Specification: Admin-editable Genres

**Feature Branch**: `030-admin-genres`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "I want an admin screen to edit the Genre's listed in the posting as well as the bowse screen (should be the same list)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An admin curates the genre list (Priority: P1)

An admin opens Settings, finds the genre list, adds a genre the community has been asking for (say
"Racing"), and saves. Hosts posting a game immediately see Racing as a choice, and players browsing
immediately see Racing as a filter. The admin needs no developer, no deploy, and no code change.

**Why this priority**: This is the entire point of the feature. Without it there is nothing — the list
stays frozen at whatever it was built with. Every other story here is a consequence of this one.

**Independent Test**: Sign in as an admin, add a genre, save, then load the posting screen and the
browse screen as an ordinary visitor and confirm the new genre is offered on both. Delivers the whole
user-visible value on its own.

**Acceptance Scenarios**:

1. **Given** an admin is viewing the genre list, **When** they add "Racing" and save, **Then** the
   list redisplays including Racing and the save is confirmed.
2. **Given** "Racing" has been added, **When** a host opens the posting screen, **Then** Racing is
   offered as a genre choice alongside the pre-existing ones.
3. **Given** "Racing" has been added, **When** a player opens the browse screen, **Then** Racing is
   offered as a filter, and selecting it returns postings tagged Racing.
4. **Given** an admin removes a genre and saves, **When** a host opens the posting screen, **Then**
   that genre is no longer offered.
5. **Given** an admin has made changes but not saved, **When** they leave without saving, **Then** the
   stored list is unchanged.

---

### User Story 2 - Removing a genre never damages existing postings (Priority: P1)

An admin retires a genre that is no longer relevant. Postings already tagged with it keep working
exactly as before: they still display their genre, they are still readable, and their hosts are not
surprised by their content changing underneath them. The genre simply stops being offered to new hosts
and stops appearing as a filter.

**Why this priority**: Equal-highest with US1 because it is the difference between a safe feature and a
destructive one. An admin edit that silently rewrote real user content would be a serious defect, and
the risk goes live the first time anyone removes anything. It ships with US1, not after it.

**Independent Test**: Tag a posting with a genre, remove that genre as an admin, then load the posting
as a visitor and confirm it still shows its genre and is otherwise untouched.

**Acceptance Scenarios**:

1. **Given** postings exist tagged "MOBA", **When** an admin removes MOBA from the list and saves,
   **Then** those postings still exist and still display "MOBA".
2. **Given** MOBA has been removed, **When** a host opens the posting screen, **Then** MOBA is not
   offered as a choice.
3. **Given** MOBA has been removed, **When** a player opens the browse screen, **Then** MOBA is not
   offered as a filter.
4. **Given** MOBA has been removed, **When** a player follows an old link or bookmark whose filter
   names MOBA, **Then** the browse screen loads normally and ignores the unknown filter, rather than
   erroring or showing a broken state.
5. **Given** MOBA has been removed, **When** the host of a MOBA posting edits and re-saves it without
   touching its genre, **Then** the save succeeds and the posting keeps its MOBA genre.

---

### User Story 3 - The list is trustworthy and cannot be corrupted (Priority: P2)

An admin cannot accidentally save a list that would break the product — an empty list, duplicates, or
blank entries. The list is one list: the posting screen and the browse screen can never disagree about
what the genres are.

**Why this priority**: Guardrails matter, but only once editing exists at all. A mistake here is
recoverable by editing again, so this ranks below the two P1 stories.

**Independent Test**: As an admin, attempt to save an empty list, a duplicate entry, and a blank
entry; confirm each is refused with a clear reason and the stored list is unchanged.

**Acceptance Scenarios**:

1. **Given** an admin has removed every genre, **When** they save, **Then** the save is refused with a
   clear reason and the stored list is unchanged.
2. **Given** an admin adds a genre that already exists (ignoring case and surrounding spaces), **When**
   they save, **Then** the duplicate is refused or silently collapsed, and the list never contains the
   same genre twice.
3. **Given** an admin adds a blank or whitespace-only entry, **When** they save, **Then** it is refused
   and the stored list is unchanged.
4. **Given** a non-admin (including a moderator) attempts to change the genre list, **When** they
   submit, **Then** the change is rejected and the stored list is unchanged.
5. **Given** any successful change, **When** an admin later reviews the audit trail, **Then** the
   change is attributable to who made it and when.

---

### Edge Cases

- **A stored posting's genre is no longer in the list.** It must still display normally. This is the
  expected steady state after any removal, not an error.
- **A browse filter names a genre that no longer exists** (old bookmark, shared link, hand-edited
  URL). The screen must load and ignore the unknown value rather than fail. Malformed filters are
  already tolerated today and that tolerance must be preserved.
- **A genre is removed and later re-added.** Postings that kept the old value line up with the
  re-added genre again; nothing needs repairing.
- **Two admins edit the list at the same time.** The last save wins. No corruption, no partial list.
- **The list grows long.** The posting and browse screens must remain usable. The list is expected to
  stay small (order of tens); no pagination is in scope.
- **A genre with unusual characters or casing** ("Co-op PvE", "TTRPG"). Existing entries prove mixed
  case and punctuation are legitimate and must be preserved exactly as typed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An admin MUST be able to view the current genre list, in the order it will be presented
  to players.
- **FR-002**: An admin MUST be able to add a genre to the list.
- **FR-003**: An admin MUST be able to remove a genre from the list.
- **FR-004**: Changes MUST take effect for hosts and players without a deploy or code change.
- **FR-005**: The posting screen and the browse screen MUST both offer exactly the genres in the
  stored list. It MUST NOT be possible for the two screens to offer different genres.
- **FR-006**: The landing screen's genre counts MUST reflect the same stored list.
- **FR-007**: Removing a genre MUST NOT modify, clear, hide, or delete any existing posting. Existing
  postings retain and display their stored genre.
- **FR-008**: A posting MUST be rejected if submitted with a genre that is not in the stored list at
  the time of submission.
- **FR-009**: A browse request naming a genre not in the stored list MUST be handled gracefully — the
  screen loads and the unknown value is ignored, never an error.
- **FR-010**: Saving an empty genre list MUST be refused.
- **FR-011**: The stored list MUST NOT contain duplicates — where duplication ignores case and
  surrounding whitespace — nor blank entries.
- **FR-012**: Only an admin MUST be able to change the genre list. Moderators and all other roles MUST
  be rejected.
- **FR-013**: Every successful change MUST be recorded in the audit trail, attributable to the admin
  who made it.
- **FR-014**: Genre text MUST be preserved exactly as the admin typed it (case and punctuation) for
  display purposes.

### Key Entities

- **Genre list**: The ordered set of genre names offered across the product. A single shared list —
  there is exactly one, and it is the only source of genres anywhere. Attributes: an ordered
  collection of non-blank, unique names.
- **Posting**: Already exists. Carries at most one genre, stored as free text. Its stored genre is
  independent of the list's current contents and is never rewritten by list edits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can add or remove a genre and see it reflected on the posting and browse
  screens with no deploy, no code change, and no developer involvement.
- **SC-002**: A genre change is visible to players within seconds of saving, without anyone restarting
  anything.
- **SC-003**: The posting screen and browse screen offer identical genre choices, verified for 100% of
  changes — including immediately after an add and after a removal.
- **SC-004**: 100% of postings tagged with a removed genre remain intact and continue to display that
  genre after the removal.
- **SC-005**: Zero ways exist for a non-admin to change the list.
- **SC-006**: A browse request naming an unknown genre never produces an error for the player.

## Assumptions

- **The list stays small.** Genres are a curated handful (today: eight), not a growing user-generated
  taxonomy. No search, pagination, or bulk import is needed. This is consistent with the ratified
  decision that *games* are free-text keywords with no catalog (ADR 0001): genres are the deliberate
  exception — a small curated set — and this feature does not disturb that balance.
- **Flat list only.** No per-genre icon, colour, description, sort weight, or active/inactive flag.
  Ordering is the list's own order. Explicitly out of scope per the user's instruction.
- **Renaming is not a distinct operation.** Removing one entry and adding another achieves it. A true
  rename that also rewrote existing postings would contradict FR-007 and is out of scope.
- **Reordering is not required.** If presentation order matters, it is the stored order; a dedicated
  reorder interaction is not specified here.
- **Existing admin settings conventions are reused** — the same place admins already manage
  configuration, the same permission rules, and the same audit-trail behaviour as other settings. No
  new admin screen and no new navigation entry.
- **Existing postings may hold genres not in the list.** This is expected and permanently supported,
  not a migration to be cleaned up. No backfill of existing posting data is in scope.
- **Seed content**: the list starts as exactly the eight genres in use today, so behaviour is
  unchanged until an admin edits it.
- **Suggested-games editing and age-group changes are separate features** and are not covered here.
