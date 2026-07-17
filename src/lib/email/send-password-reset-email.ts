import { appUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";

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
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0f1115;color:#e8eaed;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:480px;margin:0 auto;">
      <h1 style="font-size:20px;margin:0 0 16px;">Reset your password</h1>
      <p style="margin:0 0 16px;line-height:1.5;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px;line-height:1.5;">Someone asked to reset the password for your playm8z account. Choose a new one:</p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Choose a new password</a>
      </p>
      <p style="margin:0 0 8px;line-height:1.5;font-size:13px;color:#9aa0a6;">Or paste this into your browser:</p>
      <p style="margin:0 0 24px;line-height:1.5;font-size:13px;word-break:break-all;"><a href="${escapeHtml(resetUrl)}" style="color:#a48bff;">${escapeHtml(resetUrl)}</a></p>
      <p style="margin:0;line-height:1.5;font-size:13px;color:#9aa0a6;">This link expires in 1 hour and can only be used once. If this wasn't you, you can ignore this email &mdash; your password won't change until someone uses the link.</p>
    </div>
  </body>
</html>`,
  });

  if (!result.sent && result.reason !== "not-configured") {
    // FR-016. The user is told it worked no matter what (FR-004), so this
    // log is the ONLY place a failure can surface. Without it, a broken
    // provider looks exactly like a working one from every angle.
    console.error(`[send-password-reset-email] Could not send to ${user.email}: ${result.reason}`);
  }

  return result;
}
