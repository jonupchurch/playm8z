import { appUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  emailButton,
  emailLayout,
  emailParagraph,
  emailUrlFallback,
} from "@/lib/email/email-layout";

interface ResetUser {
  email: string;
  name?: string | null;
}

/**
 * The reset link itself (033/FR-001). Sent only to an account that has a
 * password (FR-003) -- a Google-only account gets
 * send-password-reset-unavailable-email.ts instead, which carries no link.
 *
 * Returns rather than throws, like every sender on this seam: the caller
 * has already written a token row, and must respond identically whether
 * this succeeded or not (FR-004).
 */
export async function sendPasswordResetEmail(
  user: ResetUser,
  rawToken: string,
): Promise<SendEmailResult> {
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const greeting = user.name ? `Hi ${user.name},` : "Hi,";

  const result = await sendEmail({
    to: user.email,
    subject: "Reset your playm8z password",
    // Keyed on the token: a fresh request mints a new token and MUST
    // actually send, while a retry of this same send must not deliver
    // twice. Keying on the user would suppress the re-send that FR-009
    // exists to make work.
    idempotencyKey: `password-reset/${rawToken}`,
    text: `${greeting}

Someone asked to reset the password for your playm8z account. Choose a new one here:

${resetUrl}

This link expires in 1 hour and can only be used once.

If this wasn't you, you can ignore this email -- your password won't change until someone uses the link above.`,
    html: emailLayout({
      title: "Reset your playm8z password",
      contentHtml: `<h1 style="font-size:20px;margin:0 0 16px;color:#e8eaed;">Reset your password</h1>
${emailParagraph(escapeHtml(greeting))}
${emailParagraph("Someone asked to reset the password for your playm8z account. Choose a new one:")}
${emailButton(resetUrl, "Choose a new password")}
${emailUrlFallback(resetUrl)}
<p style="margin:0;font-size:13px;color:#9aa0a6;">This link expires in 1 hour and can only be used once. If this wasn't you, you can ignore this email &mdash; your password won't change until someone uses the link.</p>`,
    }),
  });

  if (!result.sent && result.reason !== "not-configured") {
    // FR-016. The user is told it worked no matter what (FR-004), so this
    // log is the ONLY place a failure can surface. Without it, a broken
    // provider looks exactly like a working one from every angle.
    console.error(`[send-password-reset-email] Could not send to ${user.email}: ${result.reason}`);
  }

  return result;
}
