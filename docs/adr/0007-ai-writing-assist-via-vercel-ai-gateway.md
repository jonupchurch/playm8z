# 0007. AI writing assist calls Claude Haiku via the Vercel AI SDK + AI Gateway, not a direct Anthropic SDK

**Status**: Accepted (2026-07-15)

## Context

Feature 028 (Admin-only AI writing assist) is this project's first integration with an external AI provider — a real third-party integration, per Principle I's ADR bar. The user asked specifically for the Claude Haiku model, not for a specific provider-wiring approach. Two real options existed: call Anthropic's API directly via `@anthropic-ai/sdk` (or its own Claude Agent SDK), or go through the Vercel AI SDK's model-agnostic `generateText`/`Output.object()` API with the Vercel AI Gateway as the model provider (a plain `"anthropic/claude-haiku-4.5"` string, no provider-specific package).

## Decision

Use the **Vercel AI SDK** (`ai` package) with the **Vercel AI Gateway** as the model provider — `model: "anthropic/claude-haiku-4.5"` — rather than a direct `@anthropic-ai/sdk` dependency. This project is already deployed on Vercel (Technology Constraints) and already provisions other capabilities (Neon Postgres) through the Vercel Marketplace rather than hand-wiring provider SDKs; the AI Gateway is the same pattern for AI. It also means switching models or providers later (if Haiku turns out to be the wrong fit, or pricing/availability changes) is a one-line model-string change, not a different SDK.

## Consequences

- New dependency: the `ai` package (already added). No `@ai-sdk/anthropic` or `@anthropic-ai/sdk` needed.
- New required env var: `AI_GATEWAY_API_KEY` (or Vercel OIDC when deployed on Vercel itself) — not yet present in `.env.local`/`.env.example`; provisioning this is Setup-phase work for this feature (`docs/future-work.md` territory if deferred, otherwise a `tasks.md` Setup task).
- Structured drafts (News' title/excerpt/body; a Content Page's block set) are generated via `generateText`'s `Output.object()` with a Zod schema — this SDK version has no separate `generateObject` function (a real, version-specific difference from older AI SDK training data, confirmed by reading `node_modules/ai/docs/03-ai-sdk-core/10-generating-structured-data.mdx` directly rather than assuming).
- "Improve/rewrite," by contrast, needs no structured schema at all: it always operates on a single plain string (the News body directly, or a Content Page block's text via the editor's own existing `blockToText`/`withText` round-trip) — plain `generateText`, no `Output.object()`. One shared, surface-agnostic Server Action can serve both surfaces for this action, rather than one per surface.
- Model ID strings from an LLM's own training data are not trustworthy (they drift constantly) — confirmed the current Haiku alias via a live `GET https://ai-gateway.vercel.sh/v1/models` call at plan time (`anthropic/claude-haiku-4.5`) rather than guessing; re-verify at actual implementation time in case it's moved on again.
