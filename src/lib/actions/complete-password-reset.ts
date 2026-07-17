"use server";

import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  completePasswordResetSchema,
  type CompletePasswordResetInput,
} from "@/lib/validations/password-reset";
import { redeemPasswordResetToken } from "@/lib/auth/password-reset-token";
import { logAuditEntry } from "@/lib/admin/log-audit-entry";

export type CompletePasswordResetResult =
  | { success: true }
  | { success: false; error: string; invalidToken?: true };

// FR-018: expired, used, superseded, unknown and malformed all say this.
// The differences are real server-side but must not be visible: "expired"
// vs "never existed" tells a holder whether they're guessing at a live
// account.
const INVALID_TOKEN_MESSAGE =
  "That reset link is invalid or has expired. Request a new one and try again.";

/**
 * Completes a password reset (033/FR-010..FR-019).
 *
 * Deliberately does NOT sign the user in (FR-019). Holding a mailbox
 * justifies setting a password; it doesn't justify handing over a live
 * session. It also means the new password gets used once immediately,
 * which catches a mistyped password-manager entry while they're still
 * paying attention.
 */
export async function completePasswordReset(
  input: CompletePasswordResetInput,
): Promise<CompletePasswordResetResult> {
  const parsed = completePasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    // A password-rule failure is safe to surface: they already hold a
    // valid link, so this reveals nothing they don't know. Report the
    // password issue, never the token's state.
    const issue = parsed.error.issues.find((i) => i.path[0] === "password");
    return {
      success: false,
      error: issue
        ? "Password must be at least 8 characters."
        : INVALID_TOKEN_MESSAGE,
      ...(issue ? {} : { invalidToken: true as const }),
    };
  }

  // Redeeming is the check AND the consumption, in one atomic guarded
  // UPDATE (password-reset-token.ts). Validating first and consuming later
  // would let two concurrent submissions of one link both pass.
  const redeemed = await redeemPasswordResetToken(parsed.data.token);
  if (!redeemed) {
    return { success: false, error: INVALID_TOKEN_MESSAGE, invalidToken: true };
  }

  // Cost 10, matching register/route.ts. A different factor here wouldn't
  // fail anything -- bcrypt reads the cost from the stored hash -- it would
  // just silently give reset-users different-strength hashes from
  // signup-users, forever.
  const passwordHash = await hash(parsed.data.password, 10);

  await db
    .update(users)
    .set({
      passwordHash,
      // FR-014: redeeming the link proved they hold the mailbox, which is
      // the same thing verification asks for. Not doing this would leave a
      // user who reset from an unverified account still unable to post --
      // fixing their password but not their actual problem.
      emailVerified: new Date(),
      // FR-013 / ADR 0010: sessions are JWTs, so there is nothing to
      // delete -- revocation is this timestamp, checked in auth.ts.
      sessionsValidAfter: new Date(),
    })
    .where(eq(users.id, redeemed.userId));

  await logAuditEntry({
    actorId: redeemed.userId,
    action: "password reset completed",
    category: "access",
    targetType: "user",
    targetId: redeemed.userId,
  });

  return { success: true };
}
