# Phase 0 Research: Admin-Only AI Writing Assist

No `[NEEDS CLARIFICATION]` markers exist in `spec.md` — the one real scope ambiguity (Admin Forum has no authoring surface) was resolved with the user before drafting. The items below are this feature's real technical decisions.

## 1. Provider integration: Vercel AI SDK + AI Gateway, not a direct Anthropic SDK

**Decision**: Recorded as [ADR 0007](../../docs/adr/0007-ai-writing-assist-via-vercel-ai-gateway.md) — this is this project's first external-AI-provider integration, crossing Principle I's ADR bar. Use the `ai` package (already added to `package.json`) with the Vercel AI Gateway as the model provider: `model: "anthropic/claude-haiku-4.5"`, a plain string, no `@ai-sdk/anthropic`/`@anthropic-ai/sdk` dependency.

**Rationale**: The project is already deployed on Vercel and already provisions other capabilities (Neon Postgres) through the Vercel Marketplace rather than a hand-wired provider client; the AI Gateway is the same pattern applied to AI. Confirmed the current Haiku alias via a live `GET https://ai-gateway.vercel.sh/v1/models` call rather than trusting training-data model names (which drift) — `anthropic/claude-haiku-4.5` is current as of this plan.

**Alternatives considered**: Direct `@anthropic-ai/sdk` — rejected; it would be a second, inconsistent integration pattern next to Neon's Marketplace-provisioned setup, and ties the code to one specific provider if the model choice changes later.

## 2. Structured output API — this SDK version has no `generateObject`

**Decision**: Use `generateText` with `output: Output.object({ schema })` (a Zod schema) for "Write from scratch," per `node_modules/ai/docs/03-ai-sdk-core/10-generating-structured-data.mdx` (read directly, not assumed from memory — the standalone `generateObject` function some older AI SDK versions expose does not exist in this one).

**Rationale**: This is exactly the kind of version-specific breaking change AGENTS.md warns about; the bundled docs are the only trustworthy source.

## 3. "Improve/rewrite" needs no schema at all — reuse the editor's own text round-trip

**Decision**: "Improve/rewrite" always operates on a single plain string and returns a single revised plain string — plain `generateText`, no `Output.object()`. For a Content Page block, the client converts the selected block to plain text via `page-editor.tsx`'s own existing `blockToText()` helper (already handles every block type, including joining a `list` block's items with newlines), sends that string, and converts the AI's revised string back into the block shape via the existing `withText()` helper. For News, it's simply the body field's raw markdown string.

**Rationale**: This means ONE shared, surface-agnostic Server Action (e.g. `improve-draft-text.ts`) can serve both Admin News and Admin Content Pages for this action — no per-surface duplication, and no new schema/type needed beyond what `page-editor.tsx` already has. Found by actually reading the existing editor code rather than assuming each surface needs its own bespoke "improve" plumbing.

**Alternatives considered**: A structured "improve this block" schema mirroring `ContentBlock`'s union type — rejected as needless complexity; the existing text round-trip already fully solves the "list block has multiple items" case.

## 4. Validating the trust boundary (Principle II)

**Decision**:
- Inbound (admin → server): both the "topic" (write-from-scratch) and the "text to improve" (improve/rewrite) inputs are validated with Zod (non-empty, trimmed, a reasonable max length) before being used to build a prompt — the standard "every input crossing a trust boundary is validated" rule, even though the admin session itself is trusted; this bounds cost/abuse, not identity.
- Outbound (AI response → client): for "Write from scratch," `generateStructuredDraft()` (`src/lib/ai/gateway.ts`) re-validates the response with `schema.parse()` itself, rather than trusting the SDK's own internal `Output.object()` conformance check as the only guarantee. **Revised during implementation**: writing this feature's unit tests (which mock `generateText` entirely, per item 7 below) surfaced that the SDK's internal validation is unobservable/untestable at that mock boundary — this project's own `logAuditEntry`-style discipline is to validate explicitly at *this* code's own boundary, not depend on a third-party library's internal behavior we can't directly verify. For "Improve/rewrite," the response is a plain string; no further shape validation applies beyond a sane length cap.

**Rationale**: Matches this project's existing "validate at the boundary, not defensively everywhere" discipline (e.g. `logAuditEntry`'s own Zod schema) — just enforced explicitly in our own code rather than assumed from a dependency.

## 5. Audit logging (FR-008)

**Decision**: Every completed action calls the existing `logAuditEntry()` (`015`) with `category: "content"` (the same category Admin News'/Admin Content Pages' own publish actions already use), `action` describing which AI action ran, and `meta: { actionType, surface }`. `targetId`/`targetType` are populated when the draft is for an already-existing post/page (an "improve" on a saved draft); omitted for a brand-new "write from scratch" draft that doesn't have an id yet (it hasn't been saved).

**Rationale**: Matches Admin Settings' (024) and Moderator Audit Log's (025) own established precedent that every admin content-mutating action logs — no new logging idiom introduced.

## 6. No new persisted entity — no `data-model.md`, no `contracts/`

**Decision**: This feature adds no schema/table/column. AI-generated content is ephemeral request/response data that only ever becomes persisted through each surface's own already-existing, unchanged save action (`save-news-post.ts`, `save-content-page.ts`). Server Actions are this project's established internal-RPC pattern; per this project's own precedent (no prior feature — including ones with several Server Actions, e.g. Admin Settings' seven — has ever produced a `contracts/` folder for them), none is created here either.

## 7. Test strategy — e2e never triggers a real AI call

**Decision**: `e2e/*.spec.ts` covers the admin-only gate (a real seeded `admin` session sees the controls; a `moderator` or logged-out session does not) and the controls' visible state (e.g. "Improve/rewrite" unavailable on an empty field) — but no e2e test ever actually clicks "Write from scratch" or "Improve/rewrite" through to a real response. The full request→response→populate-the-form logic is covered at the Vitest level instead, with the `ai` package's `generateText` mocked (`vi.mock("ai", ...)`).

**Rationale**: The Server Action's outbound call to the AI Gateway happens server-side, inside the Next.js dev server process Playwright's `webServer` starts — Playwright's own request interception (`page.route()`) only intercepts requests the *browser* makes, so there's no way to stub this call from an e2e test without adding a test-only backdoor to production code (a pattern this project has consistently avoided for QA bypasses elsewhere). Actually clicking through in e2e would mean every CI run makes real, billed, non-deterministic calls to Claude Haiku — unacceptable for a suite that runs on every push.

**Alternatives considered**: A test-only env-gated fake-response mode in the Server Action itself — rejected as exactly the kind of local QA bypass this project's own established discipline avoids; Vitest's clean, standard module-mocking already solves this without touching production code at all.

## 8. Setup work this feature actually needs (flagged for `tasks.md`)

- `AI_GATEWAY_API_KEY` is not yet in `.env.local`/`.env.example` — provisioning it (Vercel AI Gateway, via the Marketplace or an API key) is real Setup-phase work, not yet done.
- No rate limit/usage cap is being added for this feature's initial scope (spec.md's own Assumptions) — revisit later if usage warrants it.
