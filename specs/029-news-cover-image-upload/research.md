# Phase 0 Research: Real Image Upload for News Post Covers

No `[NEEDS CLARIFICATION]` markers exist in `spec.md`. The items below are this feature's real technical decisions.

## 1. Storage: Vercel Blob, no store provisioned yet

**Decision**: `@vercel/blob`'s `put()`, `access: "public"` (these images are meant to be publicly visible to any visitor, same as the site's other public imagery — the vercel-storage skill's own guidance is explicit that private access is wrong for anything served publicly).

**Rationale**: Matches this project's established platform-native pattern (Neon via Marketplace, AI Gateway via ADR 0007) over a third-party file host.

**Status checked at plan time**: `vercel blob list` confirms no Blob store is attached to this project yet (`BLOB_STORE_ID` unset) — provisioning one (`vercel blob create-store`, a native, reversible Vercel CLI action) is real Setup-phase work for `tasks.md`, the same kind of gap `AI_GATEWAY_API_KEY` was for feature 028.

## 2. Upload mechanism: a Server Action taking `FormData`, not the client-upload token flow

**Decision**: A single Server Action (`upload-news-cover-image.ts`) accepts a `FormData` containing the file, validates it, and calls `put()` server-side.

**Rationale**: `@vercel/blob/client`'s token-based client upload exists for large files (up to 5TB) that shouldn't route through a server function's body-size limits. At a 5MB cap (spec.md's own Assumption), a plain Server Action receiving the file directly is simpler and matches every other write in this codebase (a Server Action, not a separate signed-upload round trip) — no new request pattern introduced for one small feature.

## 3. Validation at the trust boundary (Principle II) — plain checks, not a Zod-on-File pattern

**Decision**: The Server Action checks `file.type` against an explicit allow-list (`image/jpeg`, `image/png`, `image/webp`) and `file.size` against the 5MB cap with plain conditionals, not a Zod schema.

**Rationale**: Zod can technically validate a `File` instance, but a plain two-line check is clearer here than forcing an unfamiliar Zod-on-File pattern into this codebase's existing "Zod for structured input" convention — the check itself is trivial and doesn't benefit from schema composition.

## 4. Distinguishing a gradient from an image at render time — no schema change

**Decision**: `newsPosts.cover` stays exactly as it is (a single nullable text column) — no new column, no migration. A shared helper, `newsCoverStyle(cover, fallbackGradient)` (new: `src/lib/news/cover-style.ts`), decides at render time: a value starting with `http` is a real uploaded image (`backgroundImage`/`backgroundSize: cover`/`backgroundPosition: center`); anything else (one of the four gradient CSS strings, or `null`) renders exactly as today (`background: cover ?? fallbackGradient`).

**Rationale**: The two value shapes are already trivially distinguishable by their string shape without adding a `coverType` column/migration — this keeps the feature schema-neutral, matching features 027/028's own "no new persisted entity" precedent where a simpler option existed. All 6 real render call-sites (news-post-card.tsx, featured-post.tsx, article-related.tsx, news/[slug]/page.tsx, profile/saved/page.tsx, news-post-list.tsx) switch to this one shared helper instead of each duplicating the same inline `style={{ background: ... }}` — a DRY cleanup this feature's own cross-cutting requirement (FR-005) already forces regardless.

**Alternatives considered**: A new `coverType: "gradient" | "image"` enum column — rejected; it's a real migration for a distinction the existing string shape already encodes for free.

## 5. Test strategy — mocked Blob writes in Vitest, gate-only in e2e, one real manual check

**Decision**: Vitest covers `upload-news-cover-image.ts`'s real logic with `@vercel/blob`'s `put()` mocked (no real network write in automated tests). Playwright e2e covers only that the upload control is present/gated correctly (moderator-or-higher) — not a full real upload round-trip. The real end-to-end Blob write (upload → URL → renders correctly) is verified once, live, during implementation, the same way feature 028 verified the real AI Gateway call once outside the test suite.

**Rationale**: Unlike feature 028's AI calls, a real Blob write is cheap, free-tier, and deterministic — a real e2e upload test is technically *plausible* here in a way it wasn't for a billed LLM call. But making it work in CI would require adding `BLOB_READ_WRITE_TOKEN` as a new GitHub Actions secret and modifying `.github/workflows/ci.yml` — a shared-pipeline change with its own blast radius, out of proportion to what this feature needs to prove. Keeping the same mocked-logic/gate-only-e2e/one-real-manual-check split as 028 avoids that CI change entirely while still giving real confidence the actual wiring works.

## 6. Setup work this feature actually needs (flagged for `tasks.md`)

- A Vercel Blob store needs to be created and attached to this project (`vercel blob create-store`), and `BLOB_READ_WRITE_TOKEN` added to `.env.local` (the same safe, non-`env-pull` way `AI_GATEWAY_API_KEY` was added) and documented in `.env.example`.
- `@vercel/blob` needs to be installed.
