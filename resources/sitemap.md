# playm8z — Sitemap

Complete page map for playm8z. **Access** key: 🌐 public · 🔓 authed (logged-in user) · 🛡️ admin/moderator. Pages marked **(planned)** are not yet designed. Modal/overlay flows are listed under the pages that launch them.

---

## Site tree

```
playm8z.com
│
├── 🌐 / ......................... Logged-out landing (planned — "Discovery" direction)
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
│      └─ Apply for a slot (→ Message thread + Notification)
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
│
├── 🌐 /u/:handle ............... Public profile (planned — read-only variant)
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
│      └─ /news/:slug .......... Article view (planned detail)
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
│      ├── /admin/settings ... Auto-flag rules · roles & permissions (planned)
│      ├── /admin/audit ...... Moderation audit log (planned)
│      └── /admin/appeals .... Ban-appeals queue (planned)
│
└── SYSTEM
       ├── 🌐 /404 ............ Not found (planned)
       └── 🌐 /500 ............ Error (planned)
```

---

## Global elements (present across many pages)

- **Public top nav** — Browse · Groups · Forum · News; Log in + "Post a game"; 🔔 bell (dropdown → /notifications) + avatar when authed.
- **Admin sidebar** — Dashboard · Users · Postings · Forum · News · Content pages · Reports · Settings (with queue count badges).
- **Report modal** — global overlay launchable from any posting, forum post, profile, or message.
- **New-message compose modal** — from Inbox.
- **Footer** — logo, Browse/Groups/Forum/About, legal links, "Discord integration coming soon".

---

## Key flows (page-to-page)

1. **Match flow:** Home/Browse → Listing detail → Apply → Messages (host accepts) → play → rating (planned).
2. **Create flow:** Post a game → Listing detail (live) → applicants arrive via Notifications + Messages.
3. **Discussion flow:** Forum → Forum thread → reply / Report.
4. **Onboarding flow:** Signup → Onboarding wizard → Home.
5. **Moderation flow:** Report modal → Admin Reports → Users / Postings / Forum modules → action → (audit log).
6. **Content flow:** Admin Content Pages / News → published → public /p/:slug and /news.

---

## Status summary

**Designed (22):** Home, Browse, Post a Game, Listing, Forum, Forum Thread, Profile, Inbox, Notifications + Report modal, News, Content Page (public + admin edit), Auth & Onboarding, Design System (+ Dark/Light sheets), Brand Identity, and Admin: Dashboard, Users, Postings, Forum, Reports, News, Content Pages.

**Planned:** logged-out landing, Groups/Clans (index/detail/create), public profile, article detail, password reset, post-session rating, Discord connect, admin Settings/Audit/Appeals, 404/500.
