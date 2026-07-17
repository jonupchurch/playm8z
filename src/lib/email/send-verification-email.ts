import { appUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  emailButton,
  emailLayout,
  emailParagraph,
  emailUrlFallback,
} from "@/lib/email/email-layout";

interface VerificationUser {
  email: string;
  name?: string | null;
}

/**
 * Sends the sign-up verification email (001/FR-013).
 *
 * Until 2026-07-16 this only console.log'd the link: Resend was chosen in
 * 001's research.md #1, but its install needs a domain you own and the
 * project had none. `playm8z.net` now exists and Resend is provisioned on
 * `send.playm8z.net`, so this sends for real.
 *
 * Returns rather than throws, and the callers rely on that -- see
 * send-email.ts. Both `register/route.ts` and `update-email.ts` have
 * already committed a user row and a token row by the time they call
 * this; a throw would fail a request whose real work is done.
 */
export async function sendVerificationEmail(
  user: VerificationUser,
  token: string,
): Promise<SendEmailResult> {
  const verifyUrl = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
  const greeting = user.name ? `Hi ${user.name},` : "Hi,";

  const result = await sendEmail({
    to: user.email,
    subject: "Verify your email for playm8z",
    // Keyed on the token, not the user: a re-send issues a *new* token and
    // must actually go out, whereas a retry of this same send carries the
    // same token and should not double-deliver.
    idempotencyKey: `verify-email/${token}`,
    text: `${greeting}

Confirm your email address to finish setting up your playm8z account:

${verifyUrl}

This link expires in 24 hours. If you didn't sign up for playm8z, you can ignore this email.`,
    html: emailLayout({
      title: "Verify your email for playm8z",
      contentHtml: `<h1 style="font-size:20px;margin:0 0 16px;color:#e8eaed;">Verify your email</h1>
${emailParagraph(escapeHtml(greeting))}
${emailParagraph("Confirm your email address to finish setting up your playm8z account.")}
${emailButton(verifyUrl, "Verify your playm8z email address")}
${emailUrlFallback(verifyUrl)}
<p style="margin:0;font-size:13px;color:#9aa0a6;">This link expires in 24 hours. If you didn't sign up for playm8z, you can ignore this email.</p>`,
    }),
  });

  if (!result.sent && result.reason !== "not-configured") {
    // The account and its token already exist -- the user simply has no
    // way in. Loud, addressable, and greppable in Vercel's logs.
    console.error(`[send-verification-email] Could not send to ${user.email}: ${result.reason}`);
  }

  return result;
}

