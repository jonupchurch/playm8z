# playm8z — Build Guidelines

Context, conventions, and a per-screen spec for building **playm8z**, a matchmaking + community platform where gamers of all kinds (video games, tabletop, TTRPGs) post the games they want to play and find people to play with.

This document is written for **Claude Code in VS Code**, driving development with **GitHub Spec Kit** (spec-driven development). Treat the HTML design files in this project as the **visual + interaction source of truth**; treat this file as the **shared context** that turns those designs into specs, plans, and tasks.

---

## 1. What playm8z is

- **Core loop:** a player posts a "game" (a party looking for people) → others discover it via home/browse/search → they apply for an open slot → host accepts → they coordinate over messages → they play → they rate each other.
- **Community layer:** a forum (threads + replies), groups/clans (designed later), and a news feed.
- **Trust & safety layer:** user-facing reporting, and a full admin/moderation suite (users, postings, forum, reports, dashboard).
- **Content layer:** a mini-CMS for static pages (About, Privacy, Terms, Guidelines, etc.) and an editorial news feed.
- **Planned:** Discord integration (auto voice channels, LFG pings) — surfaced as "coming soon" in several places, not yet functional.

Audience is **all gamers, casual and hardcore**. The vibe is **fantasy-meets-cyberpunk with warm colors**, kept un-fussy.

---

## 2. Working with Spec Kit

Recommended flow when implementing from these designs:

1. **`/constitution`** — seed it from §4 (Design System) and §11 (Cross-cutting principles): warm dark-first theming, WCAG AA, the token system, accessibility and moderation-first values.
2. **`/specify`** — one spec per feature area, mirroring the page sections in §7–§9. Each design file maps to one or more specs. Pull acceptance criteria from the "Interactions" and "States" notes.
3. **`/plan`** — use §3 (recommended stack) and §5 (data models) to define the technical plan. Keep the entity list stable across features.
4. **`/tasks` / `/implement`** — build screen by screen. The designs are already component-decomposed; reuse the shared shell/nav/card/tag primitives (§4.5) rather than re-deriving per page.

**Golden rule:** the `.dc.html` files show the intended layout, spacing, colors, copy tone, and interactive behavior. When a spec and a design disagree, the design wins unless the design is clearly a stub (noted per section).

> The `.dc.html` files are "Design Components" authored in a prototyping tool. They are **reference prototypes**, not production source. Do not port them verbatim. Re-implement the UI in the chosen framework (§3) using semantic HTML, real routing, and real data.

---

## 3. Recommended stack (adjust to team preference)

- **Framework:** Next.js (App Router) or SvelteKit — SSR for public/SEO pages (news, content pages, listings), client interactivity for filters/chat.
- **Styling:** Tailwind or CSS variables driven by the token set in §4. The designs use a single token layer that remaps between dark/light — model it as CSS custom properties on a theme root.
- **Data:** Postgres (relational data below maps cleanly). Auth via an OAuth-capable provider (Discord/Google/Steam are all shown as social logins).
- **Realtime:** WebSockets/SSE for messages + notifications.
- **Fonts:** `Sora` (UI + display) and `Space Mono` (labels, meta, tags, numbers) via Google Fonts.

---

## 4. Design system

Full reference lives in **`playm8z - Design System.dc.html`** (theme-switching, canonical), with static per-theme sheets in **`playm8z - Dark Theme.dc.html`** and **`playm8z - Light Theme.dc.html`**. Brand exploration/rationale is in **`Brand Identity - playm8z.dc.html`**.

### 4.1 Identity
- **Name / wordmark:** `playm8z`, lowercase, `Sora` 700, with the `8` rendered in a gradient (amber→magenta on dark, amber→#E11D57 on light).
- **Logo mark:** two overlapping **pawns/meeples** (a front amber pawn + a back orange/magenta pawn) — signifies matchmaking / "find others". Built from a circle (head) + a `clip-path` trapezoid (body). Min sizes: mark 24px, full lockup 96px wide. Clear space ≥ one pawn-head height. Don't rotate pawns, recolor outside palette, or shadow the wordmark.
- **Tagline:** "Assemble your party."
- **Voice:** friendly, direct, gamer-native but not cringe. Casual confidence. Avoid corporate filler.

### 4.2 Type scale (both themes)
- Display: Sora 700, 44/48, -2% tracking
- H1: Sora 700, 30/36
- H2: Sora 600, 20/28
- Body: Sora 400, 15/24
- Label / meta: Space Mono 700, 12px, +6% tracking, UPPERCASE
- Tags / stats / timestamps: Space Mono 400, 11px

### 4.3 Color tokens

Brand hues are **shared** across themes; neutrals and text tones **remap**.

**Shared brand:**
- `--accent` Amber `#FFB000` — primary fills, links (dark)
- `--accent-2` Orange `#FF6B1A` — gradient end, borders
- `--pop` Magenta `#FF3B6B` (dark) / `#E11D57` (light) — highlights (use ≥16px or bold)
- `--info` Cyan `#35D0E0` — single cold spark, sparingly
- `--success` Green `#4EC96A` (dark) / `#2E9E4F` (light) — online, open slots
- `--grad` = `linear-gradient(120deg,#FFB000,#FF6B1A)` — buttons, mark
- `--grad-hot` = `linear-gradient(120deg,#FFB000,<pop>)` — headlines, avatars, the "8"

**Dark theme (default):**
- `--bg` `#140F0A` (Void) · page background
- `--surface` `#1F1710` (Panel) · cards, inputs
- `--surface-2` `#1A130C` · nested/muted surfaces
- `--border` `#2C2418` (Hairline)
- `--text` `#FBEEDA` (Cream)
- `--text-muted` `#B49C6A` (Sand) · meta, timestamps
- `--text-dim` `#9A8253`
- `--accent-text` `#FF6B1A` · accent text/links on dark
- `--on-accent` `#140F0A` · text ON amber/gradient fills (never white)

**Light theme (warm paper):**
- `--bg` `#F6EDE0` (Paper)
- `--surface` `#FFFFFF` (Card)
- `--surface-2` `#FDF7EE`
- `--border` `#ECDCC7`
- `--text` `#241A10` (Ink)
- `--text-muted` `#6B5A45` (Cocoa)
- `--accent-text` `#C2410C` (Rust) · amber/orange are **fills only** on light; for accent *text* use Rust
- `--pop` text `#E11D57`
- `--on-accent` `#241A10`

### 4.4 Accessibility rules (WCAG AA) — must hold in both themes
- Amber, orange, cyan, cream all pass AA for body text on the dark surfaces.
- **Magenta only at ≥16px or bold** (5.5:1 on dark).
- On gradient/amber fills, text is always `--on-accent` (Void on dark / Ink on light) — **never white**.
- On light, **never** put amber/orange *text* on a light surface — flip to Rust or Ink.
- Muted meta uses Sand `#B49C6A` (dark) — don't go dimmer for essential info.
- Hit targets ≥ 44px on touch.

### 4.5 Reusable component patterns
These recur across nearly every screen — build them once.

- **Public top nav:** sticky, blurred `--surface-2` bg, hairline bottom border. Left: pawn mark + wordmark. Center-left: Browse / Groups / Forum (active item gets `rgba(255,107,26,0.1)` pill). Right: Log in link + gradient "Post a game" button (or avatar when logged in). A 🔔 bell with unread badge + dropdown appears for authed users.
- **Admin shell:** 224px fixed left sidebar (`--bg`) + main. Sidebar: wordmark + red `ADMIN` tag, nav items (Dashboard, Users, Postings, Forum, News, Content pages, Reports, Settings) each with a 7px square status dot; queue items show count badges (amber for review queues, red for reports). Footer: admin avatar + role.
- **Buttons:** Primary = `--grad` fill + `--on-accent` text, radius 10–12, soft orange shadow. Secondary = `--surface-2` bg + `--border`. Ghost = `--accent-text`, transparent. Disabled = `--surface-2` + `--text-dim`, `not-allowed`.
- **Cards:** `--surface` bg, `--border`, radius 14–16. Light theme adds a soft shadow; dark uses none.
- **Tags / chips:** Space Mono, pill radius 999px. Filled (gradient + on-accent) = active/primary; tinted (`color-mix(accent 12%, transparent)` bg + 35% border) = category/attribute. Vibe: Fun=orange tint, Serious=magenta tint. Region/seats=muted tint. Online=green.
- **Segmented controls / filter chips:** active = gradient fill; idle = `--surface-2` + border. Used for sort, filters, single-select options everywhere.
- **Listing card (the atom of the product):** host avatar (gradient rounded square with initial) + name + timestamp/region + online dot; game·genre eyebrow (Space Mono uppercase); bold title; muted blurb; vibe/slot/seats tags; full-width "Request to join" primary button.
- **Avatars:** rounded square, gradient background, single uppercase initial in `--on-accent`. Never blank — always derive the initial from the name.
- **Toggle switch:** 40×23 track, gradient when on, white knob slides 2px→19px.
- **Drawer (admin):** right-side 440–460px panel over a dimmed blurred backdrop; used for detail/review across admin screens.
- **Empty states:** dashed `--border` box, centered; success queues use a green ✓ circle ("Queue clear!", "Inbox zero!").
- **Imagery:** none shipped. Covers/banners use brand gradients; real product art/screenshots are placeholders. In build, wire real images with graceful gradient fallbacks.

---

## 5. Data models (suggested)

```
User        id, username(@handle), displayName, email, avatarGradient, bio,
            region, timezone, ageGroup(13|18|21), pronouns?, languages[], platforms[],
            level, rating(avg), sessionsCount, groupsCount, reliabilityPct,
            role(user|moderator|admin), status(active|flagged|banned),
            priorWarnings, createdAt, privacy{showAge,showRegion,showOnline,discoverable}

Game        id, name, genre           // genres: FPS, RPG, Co-op PvE, Party, MOBA,
                                       // Sandbox, TTRPG, Tabletop (extensible)

Posting     id, hostId, gameId, title, blurb, vibe(fun|serious),
            region, ageGroup, timeSlots[](morning|afternoon|evening|late|weekend),
            platform(pc|console|cross|table), micRequired,
            partySize(total), spotsOpen, scheduledDate?, recurring,
            voiceLink?, tags[], status(open|full|closed), createdAt

Application id, postingId, applicantId, message, status(pending|accepted|declined), createdAt
RosterSlot  id, postingId, userId?, role(label), filled

ForumThread id, categoryId, authorId, title, body, tags[], pinned, hot,
            locked, replyCount, viewCount, likes, createdAt
ForumReply  id, threadId, authorId, body, quotedReplyId?, likes, isBestAnswer, createdAt
Category    key, label, colorToken   // general, lfg, gametalk, tabletop, groups, offtopic

Conversation id, isGroup, name?, memberIds[], lastMessageAt
Message      id, conversationId, senderId?, type(text|system), body, createdAt
             // request-type conversations carry an Application accept/decline

Notification id, userId, type(join|accepted|reply|mention|message|rating|news|system),
             actorId?, text, targetRef, read, createdAt

Report       id, reporterId, targetType(posting|forum|user|message), targetId,
             reason, details?, alsoBlock, severity(auto), status(open|resolved),
             resolution?, createdAt

NewsPost     id, title, slug, category(Announcement|Update|Event|Community|Patch Notes),
             excerpt, body(blocks), cover, status(draft|published|scheduled),
             publishDate?, pinned, authorId, updatedAt

ContentPage  id, title, slug, body(blocks), status(draft|published),
             system(bool, cannot delete), visibility, updatedAt
Block        id, type(h2|p|list|quote|callout|divider), text? | items[]

Group        id, name, ... // designed later
```

**Auto-flag / severity heuristics (moderation):** reason→severity mapping used across admin screens — high: scam/phishing, harassment, underage/safety, impersonation; medium: spam, inappropriate; low: off-topic. Auto-flags come from banned-phrase, external-link/giveaway, boosting-keyword, and new-account filters.

---

## 6. Information architecture / routes

**Public / authed:**
- `/` Home (search-first) — `playm8z - Home.dc.html`
- `/browse` Browse & search — `playm8z - Browse.dc.html`
- `/post` Post a game — `playm8z - Post a Game.dc.html`
- `/listing/:id` Listing detail + apply — `playm8z - Listing.dc.html`
- `/forum` Forum index — `playm8z - Forum.dc.html`
- `/forum/:threadId` Thread detail — `playm8z - Forum Thread.dc.html`
- `/profile` / `/u/:handle` Profile + account settings — `playm8z - Profile.dc.html`
- `/messages` Inbox — `playm8z - Inbox.dc.html`
- `/notifications` Notifications — `playm8z - Notifications & Report.dc.html`
- `/news` News feed — `playm8z - News.dc.html`
- `/p/:slug` Content pages (About/Privacy/Terms/Guidelines…) — `playm8z - Content Page.dc.html`
- `/login` `/signup` + onboarding — `playm8z - Auth & Onboarding.dc.html`
- Report modal — global overlay, from `playm8z - Notifications & Report.dc.html`

**Admin (`/admin/*`, role ≥ moderator):**
- `/admin` Dashboard — `playm8z - Admin Dashboard.dc.html`
- `/admin/users` — `playm8z - Admin Users.dc.html`
- `/admin/postings` — `playm8z - Admin Postings.dc.html`
- `/admin/forum` — `playm8z - Admin Forum.dc.html`
- `/admin/reports` — `playm8z - Admin Reports.dc.html`
- `/admin/news` — `playm8z - Admin News.dc.html`
- `/admin/content` — `playm8z - Admin Content Pages.dc.html`

**Not yet designed:** Groups/Clans, logged-out marketing landing, post-session rating flow, Discord connect flow, admin settings (auto-flag rules/roles), audit log, ban-appeals, 404/error.

---

## 7. Public pages — per-screen spec

### 7.1 Home — `playm8z - Home.dc.html`
- **Purpose:** search-first discovery; get a player matched fast.
- **Layout:** nav → centered hero (headline "Find people to play anything with", gradient accent, tagline) → prominent search bar → filter chips (Vibe: All/Fun/Serious · Region: Any/NA-East/NA-West/EU-West) → "Trending now" row of 5 game cards with live "looking" counts → "Live LFG" feed grid of listing cards.
- **Interactions:** search filters listings live (matches game/title/host); vibe + region chips filter; sort (Recent / Open seats); graceful empty state with "Post this game" CTA.
- **Tweak/prop:** `showTrending` toggles the trending row.
- **Data:** Posting[] (open), Game[] trending counts.

### 7.2 Browse & search — `playm8z - Browse.dc.html`
- **Purpose:** full faceted discovery.
- **Layout:** nav → search header → grid `[284px filter sidebar | results]`.
- **Filter facets (sidebar):** keyword search; Casual vs Serious (segmented); Game (checklist w/ counts); Genre (chips, incl. TTRPG + Tabletop); Location/Region (checklist); Time slots (chips); Age group (segmented); Open slots (Any/1+/2+/3+); Platform (PC/Console/Cross-play/**Tabletop**); "Mic required only" toggle; Clear all.
- **Results:** live count + live indicator, sort (Recent/Open seats/Soonest), **removable active-filter pills**, responsive listing-card grid, empty state.
- **Interactions:** all facets combine; multi-selects are OR within a facet, AND across facets; pills mirror state and remove individual selections.
- **Data:** Posting[] with genre/ageGroup/timeSlot/platform/mic fields.

### 7.3 Post a game — `playm8z - Post a Game.dc.html`
- **Purpose:** create a listing, with live preview.
- **Layout:** grid `[form | 380px sticky preview + publish]`.
- **Sections:** 01 Game (text input + quick-pick suggestions, Genre chips) · 02 Pitch (title 60-char, description 240-char, keywords/tags) · 03 Vibe & setup (Casual/Serious, Platform, Region select, Age group, time slots, optional date, Recurring toggle) · 04 Party & comms (Group size + Spots-open steppers with clamping, Mic-required toggle, optional Discord voice link).
- **Interactions:** every field updates the live listing-card preview; Publish disabled until game + title present; Save as draft.
- **Data:** creates a Posting.

### 7.4 Listing detail — `playm8z - Listing.dc.html`
- **Purpose:** read a posting and apply for a slot.
- **Layout:** breadcrumb → grid `[main | 360px sticky apply panel]`.
- **Main:** header (game/genre eyebrow, live "recruiting" badge, title, host + rating) · About + "What I'm looking for" checklist · Details grid (vibe/platform/region/age/schedule/mic) + tags · **Party roster** (filled members with roles + Host badge, dashed open-slot rows) · **Q&A** (questions with host replies + working "Ask a question" input that appends).
- **Apply panel:** "N spots open" + seat pips, message-to-host textarea, **Apply for a slot** → flips to "Application sent ✓ / Withdraw"; Share/Save/Report; host mini-profile (rating, sessions, reliability, View profile).
- **Data:** Posting, RosterSlot[], Application, Q&A thread.

### 7.5 Forum index — `playm8z - Forum.dc.html`
- **Purpose:** browse discussion.
- **Layout:** header + "New thread" → grid `[main | 300px right rail]`.
- **Main:** category selector (All + General/LFG/Game Talk/Tabletop & TTRPG/Groups & Clans/Off-Topic, color-dotted, live counts) → toolbar (thread search + sort Latest/Top/Unanswered) → thread list rows (avatar, PINNED/HOT badges, title + snippet, category tag + topic #tags, author + last activity, reply/view stats).
- **Right rail:** community stats, clickable trending tags (drive search), Discord "coming soon" card.
- **Rules:** pinned threads always float to top; unanswered = 0 replies.

### 7.6 Forum thread — `playm8z - Forum Thread.dc.html`
- **Purpose:** read a thread + reply.
- **Layout:** breadcrumb → grid `[main | 300px rail]`.
- **Main:** thread header (category, HOT badge, title, author, counts, Subscribe toggle + Share) · highlighted **OP** card (body, tags, upvote) · replies toolbar (count + sort Top/Newest/Oldest) · reply list (avatars, OP badge, quoted-reply support, **★ Top reply** highlight, per-reply upvote/Reply/Quote/Report) · composer (append reply live).
- **Rail:** thread info, related threads, guidelines card.
- **Interactions:** upvotes toggle (OP + replies) and re-rank under Top; posting appends + flips sort to Newest; subscribe toggles.

### 7.7 Profile + account — `playm8z - Profile.dc.html`
- **Purpose:** owner's profile view **and** account settings, tabbed.
- **Header:** avatar, name/handle, online badge, bio, rating/sessions/groups, Edit profile (→ Account tab).
- **Tabs:** **Overview** (Games I play with rank+hours, Active postings preview, Public-info sidebar: region/timezone, age group, pronouns, languages, platforms — marked "visible to all") · **My postings** (Open/Full/Closed status, applicant counts, Edit + Close/Reopen, add-new tile) · **Saved** (favorited postings, working heart-to-unsave, empty state) · **Account** (Personal info form, Change password, **Privacy toggles**: show age/region/online + discoverable, Connected accounts: Discord coming-soon / Steam connected, Danger zone: deactivate/delete).
- **Note:** the read-only **public** profile (what "View profile" opens elsewhere) is a needed variant — reuse Overview minus owner controls, honoring privacy flags.

### 7.8 Inbox / messaging — `playm8z - Inbox.dc.html`
- **Purpose:** DMs, group chats, and join-request coordination.
- **Layout:** two-pane `[340px conversation list | chat pane]`.
- **List:** searchable; avatars + online dots, listing/game context, last-message preview, timestamps, unread badges, total-unread pill. **"＋ New"** opens a compose modal.
- **Compose modal:** searchable player multi-select w/ checkboxes, selected-recipient chips (tap to remove); 2+ selected → **group** (optional Group name, "Start group chat"); creates the conversation and opens it.
- **Chat pane:** presence header + "re: [listing]" context; bubbles (yours amber-right, theirs neutral-left), centered system messages, group sender labels; **join-request banner** with Accept/Decline (accept adds "joined the party" system message, converts to normal chat); composer (Enter or Send, real timestamps).

### 7.9 Notifications + Report — `playm8z - Notifications & Report.dc.html`
- **Notifications:** nav bell (unread count + dropdown preview); full page with unread count, filters (All/Unread/Requests/Forum/System), items grouped Today/Earlier. Each: type icon on avatar, actor + text, time, unread dot. **Join requests** get inline Accept/Decline; others mark read on click. Mark-all-read.
- **Report modal (reusable, global):** target context chip → Step 1 reason radio (Spam/scam, Harassment, Inappropriate, Underage/safety, Impersonation, Other) → Step 2 optional details + "Also block this user" → Step 3 success (24h review note, block confirmation). Feeds the admin Reports queue. Trigger from any Report action across the app.

### 7.10 News feed — `playm8z - News.dc.html`
- **Purpose:** public reader for editorial posts (also surfaces on Home).
- **Layout:** header + news search → category filters (All/Announcement/Update/Event/Community/Patch Notes) → **featured** pinned post (split hero, shown on All) → card grid (cover, category chip, title, excerpt, read time, "Upcoming" flag for events) + Load more → subscribe strip.
- **Interactions:** search + category filter live (filtering folds the featured hero into the grid).

### 7.11 Content page — `playm8z - Content Page.dc.html`
- **Purpose:** render a static page publicly; edit inline when admin.
- **Public view:** article typography rendering blocks (h2, paragraph, bulleted list, callout, quote, divider) in public chrome; title + last-updated.
- **Admin edit:** with admin session, a sticky **🔒 ADMIN** bar shows status + "✎ Edit page". Editing turns every block into inline editors (editable title, per-block textareas, lists = one item/line), with move ↑/↓, delete, and an **Add block** row (Heading/Paragraph/List/Callout/Quote/Divider). Publish/Unpublish, Cancel, Save (✓ Saved). This is the intended **RTE**; production should use a real block/rich-text editor with the same block types.

### 7.12 Auth & onboarding — `playm8z - Auth & Onboarding.dc.html`
- **Auth:** Log in / Sign up tabs; social (Discord/Google/Steam); email + password (+ username + terms on signup); forgot-password on login. Log in → app; Sign up → onboarding.
- **Onboarding wizard (4 steps, progress bar, Skip):** 1 Profile (display name + avatar color, live preview) · 2 Games (multi-select chips incl. tabletop) · 3 Where & how (region, platforms, age group) · 4 Vibe (casual/serious/both + availability). Each step validates before Continue. **Done** greets by name + summary + "Start browsing".
- **Note:** the file includes a top-right **Preview switcher** (Auth/Onboarding/Done) — that is a *review aid only*, not part of the product; omit in build.

---

## 8. Admin pages — per-screen spec

All use the **admin shell** (§4.5). All list/queue screens share: stat cards row, filter chips, search, and (for moderation) a right **review drawer**.

### 8.1 Dashboard — `playm8z - Admin Dashboard.dc.html`
- KPI cards (total users, active today, new signups, live postings, open reports — reports highlighted); 7-day **activity chart** with metric switcher (Signups/Active/Postings); **recent activity / audit feed**; **Needs attention** cards routing to Reports/Postings/Forum queues; **Top games today** ranked bars.

### 8.2 Users — `playm8z - Admin Users.dc.html`
- Stats (total/active/flagged/banned); table (avatar+handle, email, region, content counts, status badge) with search + status filters. Row actions: **View** (drawer), **Ban/Unban** (updates status + stats live), **Delete** (inline confirm). **Drawer:** user summary, joined/region/reports, ban/message/delete, and **Postings / Forum posts** tabs listing their content with per-item Remove.

### 8.3 Posting moderation — `playm8z - Admin Postings.dc.html`
- Stats (in queue / user-reported / auto-flagged / removed today); filters (All/User-reported/Auto-flagged). Queue cards: **severity band**, game/title/content, author, **report-reason chips** (severity-colored), amber **AUTO-FLAG** banner. Inline Review/Approve/Remove. **Drawer:** full posting, "Why it's here" (auto-flag + who reported + why), author card (prior warnings, total posts), actions (Approve & clear, Remove, Warn, Ban). Resolving removes from queue; Remove bumps "removed today".

### 8.4 Forum moderation — `playm8z - Admin Forum.dc.html`
- Same pattern for forum content. Filters (All/Threads/Replies/Auto-flagged). Items show **THREAD/REPLY** type badge + parent thread context for replies. **Drawer** shows flagged content **in context** (preceding message dimmed, reported item highlighted), reports, author, actions incl. **🔒 Lock thread** (threads only) + Warn/Ban.

### 8.5 Reports — `playm8z - Admin Reports.dc.html`
- The unified triage queue aggregating all report types. Stats (open/high-priority/resolved today/avg response); filters by **target type** (Postings/Forum/Profiles/Messages). Cards: severity, target-type badge (color-coded), reason, **"N reports" badge** when multiple, reporter note, reported content + owner. Inline Review/Dismiss/Remove. **Drawer:** reporter note (+ "N others reported this"), reported content, **"Open in [module] moderation →"** cross-link, reported-user card, actions (Dismiss/Remove/Warn/Ban).

### 8.6 News editor — `playm8z - Admin News.dc.html`
- CMS for `NewsPost`. Left: filterable post list (All/Published/Drafts/Scheduled) with cover thumb, status, date, pin indicator; "＋ New". Editor: cover (image + color-swatch picker), title, category chips, excerpt, body textarea + formatting toolbar, **Publish settings** (status segmented, date when scheduled, pin-to-top). Sticky **live feed preview**. Publish/Update/Schedule, Save draft, Delete.

### 8.7 Content pages CMS — `playm8z - Admin Content Pages.dc.html`
- List of `ContentPage`. Stats (total/published/drafts/system). **System pages** (About Us, Privacy Policy, Terms of Use) carry a **🔒 System** badge and are **editable but not deletable**. Custom pages fully manageable. "New page" creates an "Untitled page" draft. Search + filters (All/Published/Drafts/System). Row actions: Publish/Unpublish, View, Edit (→ §7.11), Delete (custom only, inline confirm).

---

## 9. Cross-cutting principles

- **Theming:** dark is the default/primary; light is the warm-paper alternative. Drive both from one token layer; never hardcode hex where a token exists.
- **Roles:** `user` (public app), `moderator`/`admin` (admin shell). Gate `/admin/*` and inline edit affordances (e.g. Content Page edit bar) by role.
- **Moderation pipeline:** user Report modal → `Report` (open) → surfaces in Admin Reports → routes to Users/Postings/Forum modules → actions (dismiss/remove/warn/ban/lock) resolve it and write to the audit log. Auto-flags create pre-flagged queue items without a user report.
- **Notifications** are generated by domain events (application received/accepted, reply, mention, message, rating, news publish, party full) and drive the bell + `/notifications`.
- **Copy tone:** short, warm, gamer-native. Empty states are encouraging, not clinical. Buttons are verbs ("Assemble your party", "Request to join", "Queue up").
- **Numbers/meta** are always Space Mono; **prose/headings** always Sora.
- **No real imagery yet** — every cover/photo is a gradient or striped placeholder. Design real image slots with gradient fallbacks.

---

## 10. Not-yet-designed (build specs will need design first)

Groups/Clans (browse/detail/create), logged-out marketing landing (the "Discovery" direction from the brand exploration), post-session rating/review flow, Discord connect flow, admin Settings (auto-flag/banned-phrase rules, roles & permissions), mod audit log, ban-appeals queue, 404/error pages, mobile-specific layouts.

When implementing these, follow §4 (design system) and the established shell/card/tag patterns so they're consistent with the shipped screens.

---

## 11. File → feature quick map

| Design file | Route(s) | Spec area |
|---|---|---|
| Brand Identity - playm8z | — | brand rationale |
| playm8z - Design System / Dark Theme / Light Theme | — | tokens, components |
| playm8z - Home | `/` | discovery |
| playm8z - Home Wireframe | — | (lo-fi, superseded by Home) |
| playm8z - Browse | `/browse` | search & filter |
| playm8z - Post a Game | `/post` | create listing |
| playm8z - Listing | `/listing/:id` | apply flow |
| playm8z - Forum | `/forum` | forum index |
| playm8z - Forum Thread | `/forum/:id` | thread + replies |
| playm8z - Profile | `/profile`, `/u/:handle` | profile + settings |
| playm8z - Inbox | `/messages` | messaging |
| playm8z - Notifications & Report | `/notifications` + global modal | notifications, reporting |
| playm8z - News | `/news` | news reader |
| playm8z - Content Page | `/p/:slug` | static pages + inline edit |
| playm8z - Auth & Onboarding | `/login`,`/signup` | auth + onboarding |
| playm8z - Admin Dashboard | `/admin` | overview |
| playm8z - Admin Users | `/admin/users` | user admin |
| playm8z - Admin Postings | `/admin/postings` | posting moderation |
| playm8z - Admin Forum | `/admin/forum` | forum moderation |
| playm8z - Admin Reports | `/admin/reports` | report triage |
| playm8z - Admin News | `/admin/news` | news CMS |
| playm8z - Admin Content Pages | `/admin/content` | pages CMS |

*(`.dc.html` files are prototypes; reference them for layout/behavior, re-implement for production.)*
