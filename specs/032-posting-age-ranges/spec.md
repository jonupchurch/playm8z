# Feature Specification: Posting age groups become demographic ranges

**Feature Branch**: `032-posting-age-ranges`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "I want an over 30 and over 50 option for age group" — refined in conversation to: posting age group becomes a demographic *range* (Any / 18-29 / 30-49 / 50+, defaulting to Any), the existing 18+ and 21+ options are dropped, this applies to postings only (a player's own profile age tag is unchanged), and Browse filters by exact match on the tag.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A host says who their party is for (Priority: P1)

A 40-year-old wants to play with people roughly their own age — not to exclude anyone, just to find
peers. They post a game and tag it 30-49. Players browsing can filter to 30-49 and find parties that
suit them. Today the only choices are 18+ and 21+, neither of which says anything about who the party
is actually for.

**Why this priority**: This is the whole feature. The current options describe a *minimum age* nobody
is checking; the request is to describe *who the party is for*, which is a different question and the
one players actually have.

**Independent Test**: Post a game tagged 30-49, then browse filtering to 30-49 and confirm it appears.
Delivers the entire value alone.

**Acceptance Scenarios**:

1. **Given** a host is posting a game, **When** they reach the age group choice, **Then** they are
   offered exactly Any, 18-29, 30-49 and 50+, with Any selected.
2. **Given** a host tags a posting 30-49, **When** anyone views the posting, **Then** it displays
   "30-49" — not "30-49+" or any other mangled form.
3. **Given** a posting is tagged 30-49, **When** a player filters Browse to 30-49, **Then** the
   posting appears.
4. **Given** a posting is tagged 30-49, **When** a player filters Browse to 50+, **Then** the posting
   does not appear.
5. **Given** a player applies an age filter, **When** they view the active filter summary, **Then** it
   reads "30-49" — not "30-49+".
6. **Given** a host edits one of their own postings, **When** they change its age group, **Then** the
   new choices are offered, and the change saves.
7. **Given** a host publishes without touching the age group, **When** the posting appears, **Then**
   it is tagged Any — it does not claim to be for any particular age.

---

### User Story 2 - The age tag still describes, it does not gate (Priority: P1)

A 25-year-old sees a party tagged 30-49 and joins it, because they know the host and it's fine. The
age tag has never been an access control — it is a label and a filter — and this feature does not
change that. Nobody is blocked, rejected, or hidden on the basis of their age.

**Why this priority**: Equal-highest, because it is the thing most likely to be silently got wrong.
Renaming the options from "minimum age" to "who it's for" makes it *sound* like enforcement, and the
platform has no verified ages to enforce with. Building a gate here would be a serious defect and a
child-safety claim the product cannot back up.

**Independent Test**: With a posting tagged 50+, have a player of any age join it and confirm they are
neither blocked nor warned.

**Acceptance Scenarios**:

1. **Given** a posting is tagged 50+, **When** a player whose profile says 18+ applies to join,
   **Then** they are not blocked and no age-based rejection occurs.
2. **Given** a posting is tagged 18-29, **When** any player views it, **Then** they see the same
   posting and the same actions as before this feature.
3. **Given** the platform's 18+ minimum, **When** any posting is created with any age range, **Then**
   the 18+ platform minimum is unaffected and unchanged — no range implies anyone under 18 is welcome.

---

### User Story 3 - Existing postings survive the change (Priority: P1)

Postings created before this change carry the old tags. They keep displaying sensibly, their hosts are
not ambushed, and nothing about them is silently rewritten to claim something their host never said.

**Why this priority**: Equal-highest because the risk is live at the moment of release, not later. An
old "18+" posting means "everyone welcome" — silently relabelling it "18-29" would put words in a
host's mouth and mislead players. Postings expire on their own within 30 days (ADR 0003), so this is a
short-lived state that must simply be survived, not migrated.

**Independent Test**: With a posting carrying an old tag, load it and the browse screen and confirm it
displays sensibly and causes no error.

**Acceptance Scenarios**:

1. **Given** a posting created before this change carries the old "18" tag, **When** anyone views it,
   **Then** it displays its old label ("18+") legibly, not a blank, an error, or a mangled value.
2. **Given** old-tagged postings exist, **When** a player browses with no age filter, **Then** those
   postings appear normally alongside new ones.
3. **Given** old-tagged postings exist, **When** a player filters by any of the new ranges, **Then**
   the screen loads normally and old-tagged postings simply don't match — never an error.
4. **Given** a player follows an old bookmark whose filter names "21", **When** the browse screen
   loads, **Then** it loads normally and ignores the unknown filter rather than erroring.
5. **Given** a host opens an old "18"-tagged posting of their own to edit, **When** they save it,
   **Then** the save succeeds, and if they were required to pick a range, the posting now carries the
   range they chose — never one chosen on their behalf.

---

### Edge Cases

- **A player's own profile age tag.** Unchanged: it stays 18+/21+ and keeps displaying as it does
  today. Only postings change. The two now legitimately mean different things and must not be
  conflated.
- **The 21+ option is gone.** A host who previously wanted to signal "21+ only" (the alcohol-adjacent
  tabletop meetup ADR 0002 cites) can no longer do so through the age tag. This is a deliberate,
  accepted loss — recorded here so it is not later mistaken for a bug.
- **Old tags in the data.** Expected for up to 30 days after release, then gone by expiry. Tolerated,
  never rewritten.
- **A stored age value that matches nothing offered** (old tag, hand-edited URL). Displays legibly;
  filters ignore it; never an error.
- **50+ is open-ended, the others are closed.** "50+" includes anyone 50 or over. This asymmetry is
  intentional and must not be "tidied" into a closed top range.
- **"Any" means two different things depending on where it appears.** As a *posting's* tag it means
  "no age preference". As a *browse filter* it means "don't filter by age at all". They share a word
  and nothing else. A posting tagged Any is not "matched" by the Any filter — the Any filter matches
  nothing because it filters nothing. Conflating the two would either hide every Any posting or show
  every posting under every filter.
- **A host picks a range, then changes their mind back to Any.** Allowed; it is an ordinary edit and
  simply withdraws the claim.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A host creating a posting MUST be offered exactly four age groups: Any, 18-29, 30-49,
  50+ — with **Any** selected by default.
- **FR-002**: A host editing their own posting MUST be offered the same four age groups.
- **FR-003**: The 21+ and 18+ options MUST no longer be offered for new or edited postings. "Any"
  carries the meaning 18+ used to have ("everyone welcome"), so nothing expressible today is lost
  except the 21+ signal.
- **FR-004**: A posting's age group MUST display as its own label ("Any", "18-29", "30-49", "50+")
  wherever it appears, with no character appended or removed.
- **FR-005**: Browse MUST offer filtering by each of the three ranges, plus "Any".
- **FR-006**: Browse's age filter MUST match exactly — filtering to 30-49 returns only postings tagged
  30-49, and never postings tagged 18-29, 50+, or Any.
- **FR-016**: Browse's "Any" MUST mean *no age filtering* (show every posting regardless of tag). It
  MUST NOT be interpreted as "postings tagged Any". A posting tagged Any therefore appears only when
  no age filter is applied — being findable by an age filter is opt-in, by picking a range.
- **FR-007**: Browse's active-filter summary MUST display the selected range as its own label, with no
  character appended.
- **FR-008**: A posting MUST be rejected if submitted with an age group that is not one of the three.
- **FR-009**: A browse request naming an age group that is not offered MUST be handled gracefully —
  the screen loads and the unknown value is ignored, never an error.
- **FR-010**: Age group MUST NOT gate, block, warn, hide, or filter any player's ability to view a
  posting, apply to it, or be accepted. It remains a label only.
- **FR-011**: Postings created before this change MUST NOT be modified, rewritten, or relabelled.
  Their stored value stays exactly as it is.
- **FR-012**: A posting carrying a pre-existing age value MUST still display that value legibly.
- **FR-013**: A player's own profile age tag MUST be unchanged in options, storage, and display.
- **FR-014**: The platform's 18+ minimum MUST be unaffected. No age range implies anyone under 18 is
  welcome.
- **FR-015**: A host MUST NOT have an age *range* chosen for them by default. The default is "Any",
  which asserts no age preference — so a host who never touches the field never claims anything about
  who their party is for. Publishing MUST NOT be blocked on this field.

### Key Entities

- **Posting age group**: A label describing who a party is for — one of three ranges, or "Any"
  meaning no preference. Purely descriptive: carries no permission, no verification, and no
  enforcement. Distinct from, and no longer the same vocabulary as, the player's own age tag.
- **Player age tag**: Already exists, unchanged. A player's own 18+/21+ self-description on their
  profile. Shares a name with the posting's age group but, after this feature, no longer shares its
  meaning or its values.
- **Posting**: Already exists. Carries exactly one age group, which is required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host can describe their party as 18-29, 30-49, or 50+, and a player can find it by
  filtering for exactly that.
- **SC-007**: A host who ignores the age field publishes a posting that claims nothing about age —
  measurable as: 100% of postings published without touching the field are tagged Any.
- **SC-002**: An age group label renders correctly in 100% of the places a posting's age appears — no
  appended characters, no blanks, no mangled values.
- **SC-003**: Zero players are blocked, warned, or hidden from anything on the basis of an age group.
- **SC-004**: 100% of postings that existed before the change remain intact, display legibly, and are
  never relabelled.
- **SC-005**: A browse request naming an unknown or retired age value never produces an error.
- **SC-006**: A player's own profile age tag is byte-for-byte unaffected by this feature.

## Assumptions

- **This supersedes part of ADR 0002, and needs its own ADR.** ADR 0002 fixed `ageGroup` at `18|21`
  for *both* the player and the posting, framing 21+ as "an optional stricter tag ... not a
  platform-wide minimum". This feature changes the **posting** half only: from a minimum-age tag to a
  demographic range, dropping 21+. ADR 0002's other rulings — the 18+ platform minimum, the absence of
  a 13-17 tier, age being a label rather than enforcement, and the player's own `18|21` tag — all
  stand unchanged. A new ADR recording this partial supersession is part of the work, not optional
  paperwork: the next person to read ADR 0002 will otherwise implement the wrong thing.
- **No migration of existing postings.** Old tags are left exactly as stored and simply age out:
  postings auto-expire after 30 days (ADR 0003), so the mixed state is self-limiting.
  Worth being explicit, because "Any" makes a migration *look* newly available: an old "18" tag does
  mean exactly what "Any" now means ("everyone welcome"), so remapping 18 → Any would be honest. It is
  still not worth doing — it is a production data write, against rows that all disappear within 30
  days, to change a label from "18+" to "Any" that no one is confused by. And it only half-works:
  "21" has no honest target (its 21+ meaning is being dropped outright), so a migration would either
  leave a second legacy value behind anyway or overwrite a real constraint a host deliberately chose.
  Leaving both alone is simpler, writes nothing, and is consistent with how retired genres are handled
  in feature 030.
- **The two age vocabularies diverge on purpose.** After this, a posting's age group and a player's
  age tag share a name but not a meaning. This is a direct consequence of the "postings only" decision
  and is accepted; it is called out because a future reader will otherwise assume they are the same
  list and "fix" one of them.
- **Losing 21+ is accepted.** The alcohol-adjacent 21+ signal ADR 0002 cites has no replacement. This
  was raised explicitly and confirmed.
- **No enforcement is added, ever.** The platform has no verified ages. Enforcement would be a
  child-safety claim it cannot back up (ADR 0002's own reasoning), and is out of scope.
- **Genre editing and suggested-games editing are separate features** and are not covered here.
