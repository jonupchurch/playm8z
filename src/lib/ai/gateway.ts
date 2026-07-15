import { generateText, Output } from "ai";
import type { z } from "zod";

// ADR 0007 / research.md #1: Vercel AI Gateway as a plain model string,
// no @ai-sdk/anthropic dependency. Re-verify against
// `GET https://ai-gateway.vercel.sh/v1/models` if this ever 404s --
// model aliases drift.
const HAIKU_MODEL = "anthropic/claude-haiku-4.5";

// "Write from scratch" (research.md #2): this AI SDK version has no
// standalone generateObject -- structured output is generateText's own
// output: Output.object() property. Re-validated with the same schema
// here (not just trusted to the SDK's own internal check) -- Principle
// II treats the AI provider's response as data crossing a real trust
// boundary, and this project's own established discipline is to
// validate at ITS boundary explicitly rather than rely on a
// third-party library's internal behavior we can't directly observe.
export async function generateStructuredDraft<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> {
  const { output } = await generateText({
    model: HAIKU_MODEL,
    output: Output.object({ schema }),
    system,
    prompt,
  });
  return schema.parse(output);
}

// "Improve/rewrite" (research.md #3): always plain text in, plain text
// out -- no schema needed. Shared by both surfaces via
// improve-draft-text.ts, since the editor's own blockToText/withText
// round-trip already reduces a Content Page block to a string.
export async function reviseText(system: string, prompt: string): Promise<string> {
  const { text } = await generateText({
    model: HAIKU_MODEL,
    system,
    prompt,
  });
  return text;
}
