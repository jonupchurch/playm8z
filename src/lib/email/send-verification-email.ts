interface VerificationUser {
  email: string;
  name?: string | null;
}

/**
 * Sends the sign-up verification email. Resend (research.md #1) can't be
 * provisioned yet -- its Vercel Marketplace install requires a domain,
 * which this project doesn't own yet -- so this logs the verification
 * link to the server console instead of sending a real email. Swapping in
 * the real Resend client once a domain exists is a one-line change behind
 * this same function signature.
 */
export async function sendVerificationEmail(
  user: VerificationUser,
  token: string,
): Promise<void> {
  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

  console.log(
    `[send-verification-email] Verification link for ${user.email}:\n${verifyUrl}`,
  );
}
