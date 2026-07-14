"use server";

import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { subscribeNewsletterSchema, type SubscribeNewsletterInput } from "@/lib/validations/news";

export type SubscribeNewsletterResult =
  | { success: true; alreadySubscribed: boolean }
  | { success: false; error: string };

const UNIQUE_VIOLATION = "23505";

// Drizzle wraps the raw postgres.js error in a `DrizzleQueryError`,
// whose own `code` property is undefined -- the real Postgres error
// code lives one level down, at `err.cause.code` (confirmed by
// inspecting a real duplicate-key error directly; toggle-like.ts's own
// copy of this helper checked `err.code` and had never actually been
// exercised against a real thrown error before, since its own test
// only verifies the raw DB constraint, not this catch path).
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code;
  return code === UNIQUE_VIOLATION;
}

// FR-006/research.md #3: this project's first write action with no
// session check at all -- a marketing email-capture form works the
// same whether or not the visitor is logged in. `newsletterSubscribers.email`'s
// database-level unique constraint is the real duplicate-prevention
// mechanism (toggle-like.ts's own precedent): catching the violation
// here means a raced duplicate submission degrades to a harmless
// "already subscribed" outcome instead of an error.
export async function subscribeNewsletter(input: SubscribeNewsletterInput): Promise<SubscribeNewsletterResult> {
  const parsed = subscribeNewsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  try {
    await db.insert(newsletterSubscribers).values({ email: parsed.data.email });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: true, alreadySubscribed: true };
    }
    throw err;
  }

  return { success: true, alreadySubscribed: false };
}
