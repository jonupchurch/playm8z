# Phase 0 Research: Admin Users Drawer — View Full Profile in a New Tab

No `[NEEDS CLARIFICATION]` markers exist in `spec.md` — the feature description already fixed every scope boundary. The three items below are the only decisions worth recording, since each has a real (if small) alternative that was rejected.

## 1. Link target and route

**Decision**: Point the control at the existing Public Profile route, `/u/[handle]` (feature 022, `src/app/u/[handle]/page.tsx`), using the `handle` field already returned by `getUserDetail()` (`src/lib/admin/get-user-detail.ts`).

**Rationale**: This route and field already exist and are already the canonical way the rest of the app links to a public profile (e.g. Public Profile's and Follow's own tests build `/u/${handle}` links the same way). No new lookup, page, or route is needed.

**Alternatives considered**: A dedicated "admin view" of the profile — rejected per spec.md's explicit FR-004 (must be the exact same page any visitor sees) and the user's own stated scope boundary.

## 2. Opening in a new tab safely

**Decision**: Render a plain anchor (`<a>`) with `target="_blank"` and `rel="noopener noreferrer"`, rather than a client-side `window.open()` call.

**Rationale**: An `<a target="_blank">` is natively keyboard-operable (Principle III, accessibility) and works with a middle-click/ctrl-click without extra JS. `rel="noopener noreferrer"` is required whenever `target="_blank"` is used on a link to another same-origin or cross-origin page — without it, the new tab gets a `window.opener` reference back to the admin page, a real (if same-origin-limited) security smell the constitution's Principle II spirit ("input/behavior this app didn't produce is treated carefully") argues against leaving in, and it's a one-attribute fix.

**Alternatives considered**: A JS `window.open(url, "_blank")` handler — rejected as unnecessary complexity (worse keyboard/middle-click support, no accessibility benefit) for a plain navigational link.

## 3. Test strategy — real seeded role, not a workaround

**Decision**: This feature's e2e coverage logs in as a real, seeded `moderator`-role user (matching the pattern already used by Admin Settings/024, Moderator Audit Log/025, etc.) to actually open the drawer and assert the new link's `href`/`target`/`rel` attributes and destination content.

**Rationale**: `require-role.ts` was hardcoded to reject every session until Admin Settings (024) shipped the real `users.role` column (2026-07-15). The *existing* `e2e/admin-users.spec.ts` file predates that fix and still carries a header comment claiming the drawer "can't be exercised end-to-end" — that's now stale. This feature's own e2e test is the first real chance to open the actual drawer content in a browser and should do so directly, the same way 024/025's own tests already do (seed `role: "moderator"` on a real user row, log in through the real `/login` form, no `@/auth` mocking needed in Playwright).

**Alternatives considered**: Continuing to treat the drawer as unreachable in e2e and only unit-testing the link's URL construction — rejected; a real browser check that the link is present, correctly targeted, and actually navigates is stronger and now cheap to get.
