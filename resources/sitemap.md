# playm8z — Sitemap

Complete page map for playm8z. **Access** key: 🌐 public · 🔓 authed (logged-in user) · 🛡️ admin/moderator. Pages marked **(planned)** are not yet designed. Modal/overlay flows are listed under the pages that launch them.

---

## Site tree

```
playm8z.com
│
├── 🌐 / (logged-out) ........... Marketing landing  [Landing]
│                                  → redirects authed users to Home
│
├── 🔓 / (Home) ................. Search-first discovery
│      ├─ hero search + vibe/region filter chips
│      ├─ Trending games
│      └─ Live LFG feed → Listing detail
│
├── 🌐 /browse .................. Browse & search
│      ├─ faceted filters (game, genre, region, age, vibe,
│      │   time slots, open slots, platform, mic, keywords)
│      └─ results → Listing detail
│
├── 🔓 /post .................... Post a game (create listing + live preview)
│
├── 🌐 /listing/:id ............. Listing detail
│      ├─ about / requirements / details / roster / Q&A
│      ├─ Apply for a slot (→ Message thread + Notification)
│      └─ ⚑ Report modal (overlay)
│
├── 🌐 /forum ................... Forum index
│      ├─ categories: General · LFG · Game Talk ·
│      │   Tabletop & TTRPG · Groups & Clans · Off-Topic
│      ├─ New thread (planned composer)
│      └─ thread → Forum thread
│
├── 🌐 /forum/:threadId ......... Forum thread (OP + replies + composer)
│      └─ ⚑ Report (per post) → Report modal
│
├── 🌐 /groups .................. Groups / Clans index (planned)
│      ├── /groups/:id .......... Group detail (planned)
│      └── /groups/new .......... Create group (planned)
│
├── 🔓 /profile ................. My profile + account settings
│      ├─ Overview (games, active postings, public info)
│      ├─ My postings (manage / close / reopen)
│      ├─ Saved (favorited listings)
│      └─ Account (personal info · password · privacy ·
│                   connected accounts · danger zone)
│           └─ 🔓 /settings/blocked ... Blocked users  [Blocked Users]
│                   ├─ Block modal (pick → confirm + also-report)
│                   └─ Unblock modal
│
├── 🌐 /u/:handle ............... Public profile (read-only)  [Public Profile]
│      ├─ games · open parties · player reviews
│      └─ Invite / Message / Follow / ⋯ (Share·Report·Block)
│
├── 🔓 /messages ................ Inbox
│      ├─ conversation list + ＋ New (compose / group chat)
│      ├─ chat pane (DM · group · join-request accept/decline)
│      └─ (post-session rating flow — planned)
│
├── 🔓 /notifications ........... Notifications
│      └─ filters: All · Unread · Requests · Forum · System
│      └─ (bell dropdown available on all authed pages)
│
├── 🌐 /news .................... News feed (reader)
│      ├─ featured + category filters
│      └─ /news/:slug .......... News article  [News Article]
│
├── 🌐 /p/:slug ................. Content pages
│      ├─ /p/about ............. About Us            (system)
│      ├─ /p/privacy ........... Privacy Policy      (system)
│      ├─ /p/terms ............. Terms of Use        (system)
│      ├─ /p/guidelines ........ Community Guidelines
│      ├─ /p/safety ............ Safety Center
│      ├─ /p/help .............. Help & FAQ
│      ├─ /p/careers ........... Careers
│      └─ (🛡️ inline admin edit mode on any content page)
│
├── AUTH
│      ├── 🌐 /login ........... Log in (email + social: Discord/Google/Steam)
│      ├── 🌐 /signup .......... Sign up
│      ├── 🔓 /onboarding ...... 4-step wizard (profile · games · where/how · vibe)
│      └── 🌐 /reset ........... Password reset (planned)
│
├── 🛡️ ADMIN (/admin/*) — role ≥ moderator
│      ├── /admin ............. Dashboard (KPIs · activity chart ·
│      │                         audit feed · needs-attention · top games)
│      ├── /admin/users ...... User management (+ review drawer)
│      ├── /admin/postings ... Posting moderation queue (+ drawer)
│      ├── /admin/forum ...... Forum moderation queue (+ drawer)
│      ├── /admin/reports .... Unified report triage (+ drawer, cross-links)
│      ├── /admin/news ....... News editor / CMS (+ live preview)
│      ├── /admin/content .... Content pages CMS (system + custom)
│      ├── /admin/settings ... General · Moderation/auto-flag · Roles ·
│      │                         Feature flags · Safety  [Admin Settings]
│      ├── /admin/audit ...... Moderation audit log (filter · expand · export)  [Audit Log]
│      └── /admin/appeals .... Ban-appeals queue (planned)
│
└── SYSTEM
       ├── 🌐 /404 ............ Not found        ┐
       ├── 🌐 /500 ............ Server error     ├─ [Error Pages]
       └── 🌐 /maintenance .... Maintenance      ┘  (maintenance ties to Settings toggle)
```

---

## Global elements (present across many pages)

- **Public top nav** — Browse · Groups · Forum · News; Log in + "Post a game"; 🔔 bell (dropdown → /notifications) + avatar when authed.
- **Admin sidebar** — Dashboard · Users · Postings · Forum · News · Content pages · Reports · Settings · Audit log (with queue count badges).
- **Report modal** — global overlay launchable from any posting, forum post, profile, or message.
- **Block / Unblock modals** — launchable from any profile or message; managed at /settings/blocked.
- **New-message compose modal** — from Inbox.
- **Footer** — logo, Browse/Groups(soon)/Forum/News, company + legal links, "Discord integration coming soon".

---

## Key flows (page-to-page)

1. **Match flow:** Home/Browse → Listing detail → Apply → Messages (host accepts) → play → rating (planned) → shows on Public profile.
2. **Create flow:** Post a game → Listing detail (live) → applicants arrive via Notifications + Messages.
3. **Discussion flow:** Forum → Forum thread → reply / Report.
4. **Acquisition flow:** Landing → Signup → Onboarding wizard → Home.
5. **Content flow:** News feed → News article; Admin News/Content Pages → published → public /news + /p/:slug.
6. **Moderation flow:** Report modal → Admin Reports → Users / Postings / Forum modules → action → Audit log. Settings tunes auto-flag rules & thresholds that feed the queues.
7. **Safety flow:** Public profile ⋯ → Block/Report → manage at /settings/blocked.

---

## Status summary

**Designed (29):** Landing, Home, Browse, Post a Game, Listing, Forum, Forum Thread, Profile, Public Profile, Blocked Users, Inbox, Notifications + Report modal, News, News Article, Content Page (public + admin edit), Auth & Onboarding, Error Pages, Design System (+ Dark/Light sheets), Brand Identity, and Admin: Dashboard, Users, Postings, Forum, Reports, News, Content Pages, Settings, Audit Log.

**Planned:** Groups/Clans (index/detail/create), password reset, standalone post-session rating flow, Discord connect flow, ban-appeals queue, mobile-specific layouts.
