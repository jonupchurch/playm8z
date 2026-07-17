"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/lib/validations/password-reset";
import {
  createPasswordResetToken,
  wasResetRequestedRecently,
} from "@/lib/auth/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { sendPasswordResetUnavailableEmail } from "@/lib/email/send-password-reset-unavailable-email";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";

export type RequestPasswordResetResult =
  | { success: true }
  | { success: false; error: string };

/**
 * The single response. Named and returned from one place so that no branch
 * below can accidentally answer differently -- FR-004 is a property of this
 * function's *shape*, not of remembering to be careful in four places.
 *
 * The wording is deliberately conditional ("if that address has an
 * account"). "We've sent you an email" would be a lie for two of the three
 * cases, and a lie the reader can detect by waiting.
 */
const IDENTICAL_RESPONSE: RequestPasswordResetResult = { success: true };

/**
 * Starts a password reset (033/FR-001..FR-007).
 *
 * The security property that shapes everything here: the caller learns
 * NOTHING about whether the address has an account (FR-004). Three
 * different things happen internally -- a link is sent, a "you use Google"
 * note is sent, or nothing is sent -- and all three return the same value.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<RequestPasswordResetResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    // The ONLY case that may answer differently, and it's safe: this is
    // "that isn't an email address", which is true of the *string*, not of
    // whether anyone owns it. A well-formed unknown address must never
    // reach here.
    return { success: false, error: "Enter a valid email address." };
  }

  const { email } = parsed.data;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email));

  await logAuditEntry({
    // No authenticated actor -- this is a logged-out stranger. Exactly why
    // auditEntries.actorId is nullable.
    actorId: null,
    action: "password reset requested",
    category: "access",
    targetType: user ? "user" : undefined,
    targetId: user?.id,
    targetLabel: email,
    meta: { outcome: resolveOutcome(user) },
  });

  // FR-006: no account, nothing sent. Note we still returned above's audit
  // entry -- a burst of requests for addresses that don't exist is itself
  // worth being able to see.
  if (!user) return IDENTICAL_RESPONSE;

  // FR-005: a Google account has no password to reset (research.md #8 --
  // `passwordHash IS NULL` is the definition of "Google-only", and is the
  // same test auth.ts uses to refuse a password login on such an account).
  if (!user.passwordHash) {
    await sendPasswordResetUnavailableEmail({ email: user.email, name: user.name });
    return IDENTICAL_RESPONSE;
  }

  // FR-020, enforced on the SEND and never on the response. Telling the
  // caller "wait 42 seconds" would confirm the address has a password
  // account -- the precise leak FR-004 forbids. Silence is the point.
  if (await wasResetRequestedRecently(user.id)) {
    return IDENTICAL_RESPONSE;
  }

  const rawToken = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail({ email: user.email, name: user.name }, rawToken);

  // Deliberately NOT conditioned on the send succeeding. sendEmail() never
  // throws and reports failure by returning; surfacing that here would
  // make a bounced address distinguishable from a delivered one, and the
  // failure is already logged for operators (FR-016).
  return IDENTICAL_RESPONSE;
}

function resolveOutcome(user?: { passwordHash: string | null }): string {
  if (!user) return "no-account";
  if (!user.passwordHash) return "google-only";
  return "link-sent";
}
