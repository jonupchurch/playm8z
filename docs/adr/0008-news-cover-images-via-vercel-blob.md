# 0008. News post cover images are stored in Vercel Blob, not the database

**Status**: Accepted (2026-07-15)

## Context

Feature 029 adds real image upload for News post covers, reversing feature 020's own "no real imagery yet" scope decision. This is the first user-uploaded file anywhere in this project. Two real options existed: store the uploaded bytes directly (a `bytea`/base64 column in Postgres) or store the file in dedicated object storage and keep only a URL in `newsPosts.cover`.

## Decision

Use **Vercel Blob** (`@vercel/blob`, `access: "public"`) for the actual file, with the existing `newsPosts.cover` text column holding the resulting public URL — exactly the same field that already stores a gradient CSS string today, just a different string shape. No new column, no migration.

## Consequences

- New dependency: `@vercel/blob`. A Vercel Blob store must be provisioned and attached to the project (`vercel blob create-store`) — not yet done as of this plan (research.md #6); `BLOB_READ_WRITE_TOKEN` needs to reach both local `.env.local` and Vercel's Production/Preview env vars, the same way `AI_GATEWAY_API_KEY` was provisioned for feature 028.
- Rejected storing bytes in Postgres: bloats the database with binary data Postgres isn't optimized to serve directly to a browser, and every read would need its own byte-serving route rather than a plain, CDN-backed URL a browser can request directly.
- A gradient CSS string and a real image URL now share one column, distinguished at render time by shape (a value starting with `http` is a real image) rather than a new `coverType` column — a deliberate simplicity choice (research.md #4), not an oversight.
- Replacing an already-uploaded cover image does not delete the old blob in this initial version (spec.md's own Assumptions) — low-stakes at this project's current scale; revisit if storage growth becomes a real cost concern.
