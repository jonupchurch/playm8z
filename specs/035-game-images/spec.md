# Feature Specification: Game Headline Images

**Feature Branch**: `035-game-images`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "When posting a game, either upload a headline image for it, or create a library of game images to show instead of just the orange block." — resolved through discussion to: admin-managed headline images per game name, with a distinct auto-generated visual as the fallback.

## Context

Games appear on playm8z as a **flat, identical orange gradient block** — on
Home's "Trending Now" cards most visibly, and wherever else a game is
surfaced. Every game looks the same. The user wants real game imagery.

The decisive fact — established by reading the code together — is that
**"Trending Now" is game-keyed, not posting-keyed.** It's computed live by
grouping open postings by their free-text `game` name and counting; one card
("D&D 5e · 2 open") can stand for several postings. So an image uploaded to
one *posting* can't fill that card — which of the game's postings would it
show? The image has to attach to the **game name**, not a posting. That is
why this is an admin-managed, per-game feature rather than a per-host upload.

**This deliberately softens, but does not reverse, a prior decision.** ADR
0001 made `game` a free-text keyword with no curated catalog, to avoid
maintenance. This feature does not build a catalog that postings must match:
postings stay free-text and untouched, Post-a-Game is unchanged, new games
keep working with zero admin action. An admin *optionally* attaches an image
to a game name (with aliases for spelling variants); a game with no image
shows a generated visual. ADR 0001's own closing line pre-authorises exactly
this — "a lightweight alias table is a smaller, reversible fix to layer on
top" — so the relationship is a blessed layer, recorded in a new ADR 0011,
not a reversal.

**The single most important outcome**: a game name *resolves to an image* —
an admin image if curated, otherwise a distinct generated visual — on the
Trending block. The admin tooling (upload, aliases, AI-assisted alias
suggestions) exists to make that resolution good and keep it maintainable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Games stop looking identical (Priority: P1)

A visitor on Home sees the Trending games as distinct tiles — a curated
image where the team has added one, and a distinct, game-specific generated
visual where they haven't — instead of the same orange block for every game.

**Why this priority**: This is the user's actual complaint and the feature's
reason to exist. Even with zero admin curation on day one, the generated
visual alone makes every game look different — so this story delivers value
before anyone uploads a single image.

**Independent Test**: With no admin images set, load Home and confirm two
different trending games render two visibly different tiles (not the same
orange). Then set an admin image for one game and confirm that game's tile
shows the real image.

**Acceptance Scenarios**:

1. **Given** a game with no admin image, **When** its Trending tile renders,
   **Then** it shows a distinct visual derived from the game name — the same
   every time for that name, and different from other games — never the flat
   identical orange block.
2. **Given** an admin has set a headline image for a game, **When** a
   Trending tile for a posting whose game matches that game renders, **Then**
   it shows the admin image.
3. **Given** two different game names, **When** both render without admin
   images, **Then** their generated visuals are visibly different from each
   other.

---

### User Story 2 - An admin curates a game's image (Priority: P1)

A moderator opens an admin Games screen, adds a game, uploads its headline
image, and immediately sees that image appear on the public Trending tile
for that game.

**Why this priority**: Without a way to set images, the feature is only the
generated fallback. This is the half that lets the team make hero games
(D&D, Valorant, the current trending set) look genuinely good.

**Independent Test**: As a moderator, add a game with a name matching an
existing open posting, upload an image, and confirm it appears on that game's
public Trending tile.

**Acceptance Scenarios**:

1. **Given** a moderator on the admin Games screen, **When** they add a game
   with a name and upload a valid image, **Then** the game is saved and its
   image is stored.
2. **Given** a game with an image, **When** the moderator replaces the image,
   **Then** the new image shows publicly and the previous file is not left
   accruing storage.
3. **Given** a moderator uploading an invalid or oversized file, **When**
   they submit, **Then** it is rejected with a clear message and the game's
   current image is unchanged.
4. **Given** a non-moderator, **When** they attempt to reach the admin Games
   screen or its actions, **Then** they are refused.

---

### User Story 3 - Catch spelling variants with aliases (Priority: P2)

Hosts type game names freely, so "D&D 5e", "DnD 5e", and "dungeons & dragons"
are three different strings. A moderator maps the variants to one game as
**aliases**, so all three show that game's image.

**Why this priority**: Without aliases, an admin image only shows for the
exact spelling the admin used; every other spelling falls back to a generated
visual, which undercuts curation. Lower than P1 because the feature still
works (generated fallback) before aliases exist — aliases improve coverage.

**Independent Test**: Set an image for "D&D 5e", confirm a posting with game
"DnD 5e" shows the generated fallback (no match); add "DnD 5e" as an alias;
confirm that posting now shows the D&D 5e image.

**Acceptance Scenarios**:

1. **Given** a game with an image, **When** a moderator adds a spelling
   variant as an alias, **Then** postings whose game matches that variant
   resolve to the game's image.
2. **Given** an alias already mapped to one game, **When** a moderator tries
   to map the same normalised string to a different game, **Then** it is
   refused — an alias belongs to exactly one game.
3. **Given** matching by name, **When** two strings differ only by case or
   surrounding spaces, **Then** they are treated as the same — normalisation
   is case-insensitive and trimmed, matching how Trending already groups.

---

### User Story 4 - AI proposes aliases, the admin decides (Priority: P3)

Rather than hunt for variants by hand, a moderator clicks "suggest matches."
The system looks at the real unmatched game names sitting in postings and
proposes alias mappings ("these look like D&D 5e"); the moderator accepts or
rejects each.

**Why this priority**: A convenience over doing aliases by hand (Story 3),
valuable at scale but not required for the feature to work. It is explicitly
**assistive** — the moderator owns every decision, because an automated
mapping can wrongly merge distinct games ("Souls" → which one?).

**Independent Test**: With several unmatched near-duplicate game strings in
postings, trigger the suggestion; confirm proposals are shown for approval,
that accepting one creates the alias, and that rejecting one creates nothing.

**Acceptance Scenarios**:

1. **Given** unmatched game strings across postings, **When** a moderator
   requests suggestions, **Then** the system proposes candidate
   string→game mappings for review without applying any of them.
2. **Given** a proposed mapping, **When** the moderator accepts it, **Then**
   it becomes an alias exactly as if added by hand (Story 3), including the
   one-game-per-alias rule.
3. **Given** a proposed mapping, **When** the moderator rejects it, **Then**
   nothing is created and the same proposal need not reappear indefinitely.
4. **Given** the suggestion runs, **When** it produces candidates, **Then**
   no mapping is ever applied automatically — every alias requires an
   explicit accept.

---

### Edge Cases

- **A game name matches no admin game and no alias.** It shows the generated
  visual. This is the common case on day one and must look good, not broken.
- **Two raw spellings of one game are BOTH trending** ("D&D 5e" 1 open, "dnd
  5e" 1 open). They remain **two separate Trending rows** with two counts —
  this feature attaches images, it does **not** merge Trending counts (that
  would change ADR 0001's grouping and is out of scope). If both resolve (via
  alias) to the same game, both rows show the same image — acceptable and
  expected.
- **An admin image URL stops resolving.** The tile degrades to the generated
  visual, never a broken image.
- **A game is disabled/removed by an admin.** Per no-hard-delete, the game
  record is soft-disabled, not deleted; its postings (free-text, untouched)
  simply fall back to the generated visual.
- **The generated visual must be deterministic.** The same game name yields
  the same visual on every render and every surface — not random per page
  load — or the site looks unstable.
- **AI suggests a wrong merge** ("Elden Ring" ← "Souls"). The approval step is
  the guard; an accepted-in-error alias is removable like any other.
- **No AI provider configured** (local/CI). The suggestion feature degrades
  gracefully — the admin can still manage games and aliases by hand; only the
  "suggest" convenience is unavailable.
- **A posting's game is empty/blank.** It contributes no Trending row and
  needs no image.

## Requirements *(mandatory)*

### Functional Requirements

**Resolving a game to an image (the core)**

- **FR-001**: The system MUST resolve any game name to an image for display:
  the curated admin image if the name (normalised) matches a game or one of
  its aliases; otherwise a generated visual.
- **FR-002**: The generated visual MUST be deterministic — the same game name
  MUST produce the same visual on every render and every surface — and MUST
  be visibly distinct between different game names. It MUST NOT be the current
  flat identical orange block.
- **FR-003**: Name matching MUST be normalised the same way Trending already
  groups games: at minimum case-insensitive and whitespace-trimmed. The
  normalisation rule MUST be shared, not reimplemented per surface.
- **FR-004**: Resolution MUST be a fast, deterministic lookup at render time
  with no AI call and no external dependency on the hot path.

**Where images appear (read path)**

- **FR-005**: Home's "Trending Now" tiles MUST show the resolved image
  (admin or generated) instead of the flat orange block. This is the primary
  required surface.
- **FR-006**: Trending MUST continue to group and label games by the raw
  free-text name exactly as today — this feature changes only the image
  shown, not what Trending counts, groups, or labels.
- **FR-007**: Other surfaces that display a game (posting cards, listing
  detail) MAY adopt the resolved image for consistency, but the Trending
  block is the only required surface for this feature.

**Admin management**

- **FR-008**: A moderator-or-higher MUST be able to create a game with a
  name, and upload, replace, and remove its headline image. This is content
  curation, gated like the News editor (moderator), not like site settings
  (admin-only).
- **FR-009**: This management MUST live on its own admin surface, not the
  existing Lists chip-editor (which is for flat string arrays and cannot hold
  images or aliases).
- **FR-010**: Uploaded game images MUST be server-validated for type and size
  before storage, reusing the platform's existing image-upload constraints.
- **FR-011**: Replacing or removing a game's image MUST NOT leave the prior
  image file accruing storage indefinitely (a stored *file*, distinct from a
  database *record* — see FR-013).
- **FR-012**: A game name MUST be unique (normalised) across games — two games
  cannot claim the same name.
- **FR-013**: Removing a game MUST soft-disable the record (no hard delete,
  per platform policy); a disabled game's name resolves to the generated
  visual, and its postings are unaffected.

**Aliases**

- **FR-014**: A moderator MUST be able to add and remove aliases mapping a
  spelling variant to a game.
- **FR-015**: An alias MUST map to exactly one game — the same normalised
  string MUST NOT be an alias for two games, and MUST NOT collide with an
  existing game's own name.
- **FR-016**: A posting whose game (normalised) matches a game's alias MUST
  resolve to that game's image, identically to matching the game's own name.

**AI-assisted alias suggestions**

- **FR-017**: A moderator MUST be able to request AI-generated *suggestions*
  for aliases, computed over the real unmatched game names present in
  postings.
- **FR-018**: A suggestion MUST NEVER be applied automatically — each MUST
  require an explicit moderator accept before it becomes an alias, and MUST
  pass the same one-game-per-alias rule (FR-015).
- **FR-019**: The AI MUST run only in this batch, moderator-initiated,
  reviewed path — never on the render/read path (FR-004) and never as an
  unreviewed write.
- **FR-020**: If no AI provider is configured, game/alias management MUST
  still function fully by hand; only the suggestion convenience is
  unavailable.

**Governance**

- **FR-021**: The softening of ADR 0001 (a lightweight alias/image table
  layered on top of free-text games, postings unchanged) MUST be recorded in
  a new ADR that references and amends, rather than silently contradicts,
  ADR 0001.

### Key Entities

- **Game**: a curated entity — a canonical name, an optional headline image,
  and an enabled/disabled state. Its name is unique (normalised). It exists
  only to attach an image (and aliases) to a name; it is **not** a foreign
  key that postings reference, and postings are unaffected by its existence.
- **Game alias**: a normalised spelling variant that maps to exactly one
  Game. Used only for image resolution — never to merge Trending counts.
- **Alias suggestion** (transient): a proposed string→Game mapping produced
  by the AI for moderator review; becomes a Game alias only on accept, and is
  not itself persisted as an applied mapping until then.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On Home, with zero admin images configured, every distinct
  trending game renders a visibly different tile — 0 games show the flat
  identical orange block.
- **SC-002**: After a moderator sets an image for a game, that image appears
  on the public Trending tile for that game within one page load.
- **SC-003**: A game's image renders identically for every spelling mapped to
  it via name-or-alias — a curated image reaches 100% of its aliased
  spellings.
- **SC-004**: The generated visual for a given game name is identical across
  repeated loads and across surfaces — no visual instability.
- **SC-005**: No game tile ever renders as a broken image; the worst case is
  the generated visual.
- **SC-006**: A moderator can take a brand-new game from "not in the system"
  to "its image live on Trending" in under two minutes, entirely within the
  admin screen.
- **SC-007**: 100% of AI-proposed aliases require an explicit accept — none is
  ever applied automatically.

## Assumptions

- **Trending stays keyed on the raw free-text game string** (FR-006). This
  feature never changes what Trending counts or how it groups; aliases affect
  *image lookup only*, not count merging. Merging counts across spellings is a
  larger, separate decision, deliberately excluded.
- **The existing image-upload mechanism and constraints are adopted
  wholesale** (formats, size limit, storage), same as profile images (034)
  and News covers (029). The 1MB platform gotcha is already fixed app-wide.
- **The existing AI Gateway is reused** for suggestions (the same mechanism
  feature 028 uses), not a new AI integration.
- **"Normalised" means at least lowercase + trim**, matching the existing
  Trending grouping. Richer normalisation (punctuation, fuzzy distance) may be
  layered in but the baseline must match how games are already grouped, so
  image lookup and Trending grouping agree on what "the same game" is.
- **Post-a-Game is not touched by this feature.** The typeahead + "did you
  mean?" suggestion that reduces fragmentation at entry is companion feature
  036, which depends on this feature's game list existing.
- **Generated visuals are computed, not stored** — derived from the game name
  on the fly, so they need no storage and no backfill.

## Out of Scope

- The Post-a-Game **typeahead and "did you mean?"** suggestion — companion
  feature 036 (depends on this feature's game list).
- **Per-posting** host-uploaded images — the user chose admin-managed
  per-game instead.
- **Merging Trending counts** across alias spellings — this attaches images
  only; grouping/counting is unchanged (FR-006).
- A public **per-game hub page** (`/games/:slug`) — still ADR 0001 future
  work.
- Making `game` a **foreign key** or otherwise changing how postings store
  their game — postings stay free-text.
- AI running **unreviewed** or **on the render path**.
- Server-side image processing (resize/thumbnail) beyond what display needs.
