"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { updateEmailSchema } from "@/lib/validations/profile";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type UpdateEmailResult = { success: true } | { success: false; error: string };

// FR-006: changing the address resets emailVerified and sends a new
// verification email to the NEW address, reusing Auth & Onboarding's
// existing helper (research.md #4) rather than a second code path.
export async function updateEmail(input: { email: string }): Promise<UpdateEmailResult> {
  const authUser = await requireAuth();

  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const newEmail = parsed.data.email;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail));
  if (existing && existing.id !== authUser.id) {
    return { success: false, error: "That email is already registered." };
  }

  try {
    await db
      .update(users)
      // ADR 0010: an in-session identity change signs out every other
      // session too (the same "sign out everywhere" timestamp bump a
      // password change/reset uses). The current device re-logs in after.
      .set({ email: newEmail, emailVerified: null, sessionsValidAfter: new Date() })
      .where(eq(users.id, authUser.id));
  } catch (err) {
    // Drizzle wraps the raw postgres.js error in a `DrizzleQueryError`,
    // whose own `code` is undefined -- the real code lives at
    // `err.cause.code` (fixed 2026-07-13, News feed/013's session,
    // after finding the identical bug in toggle-like.ts).
    const code =
      err && typeof err === "object"
        ? ((err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code)
        : undefined;
    if (code === "23505") {
      return { success: false, error: "That email is already registered." };
    }
    throw err;
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await db.insert(verificationTokens).values({ identifier: newEmail, token, expires });

  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, authUser.id));
  await sendVerificationEmail({ email: newEmail, name: user?.name }, token);

  return { success: true };
}
