import { appUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";

interface ResetUser {
  email: string;
  name?: string | null;
}

/**
 * Sent when someone asks to reset the password on an account that has no
 * password -- a Google sign-up (033/FR-005).
 *
 * Why send anything at all: FR-004 requires the *screen* to say the same
 * thing for every address, so silence here would leave a real user waiting
 * on a message that is never coming, with the site insisting it sent one.
 * They aren't locked out; they just don't remember which button they used.
 *
 * Contains NO reset link, and must not grow one. There is no password to
 * reset, and minting a token here would hand a Google account a second way
 * in that its owner never asked for (research.md #8).
 */
export async function sendPasswordResetUnavailableEmail(
  user: ResetUser,
): Promise<SendEmailResult> {
  const loginUrl = `${appUrl()}/login`;
  const greeting = user.name ? `Hi ${user.name},` : "Hi,";

  const result = await sendEmail({
    to: user.email,
    subject: "About your playm8z account",
    // Keyed on the address rather than a token -- there is no token. The
    // 24h idempotency window doubles as a sensible cap on repeats of a
    // message whose content never changes.
    idempotencyKey: `password-reset-unavailable/${user.email}`,
    text: `${greeting}

Someone asked to reset the password for the playm8z account registered to this address.

That account signs in with Google, so it doesn't have a password to reset. To get in, use "Continue with Google" on the login page:

${loginUrl}

If this wasn't you, you can safely ignore this email. Nothing about your account has changed.`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0f1115;color:#e8eaed;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:480px;margin:0 auto;">
      <h1 style="font-size:20px;margin:0 0 16px;">This account uses Google sign-in</h1>
      <p style="margin:0 0 16px;line-height:1.5;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px;line-height:1.5;">Someone asked to reset the password for the playm8z account registered to this address.</p>
      <p style="margin:0 0 24px;line-height:1.5;">That account signs in with Google, so there's no password to reset. To get in, use <strong>Continue with Google</strong> on the login page.</p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Go to login</a>
      </p>
      <p style="margin:0;line-height:1.5;font-size:13px;color:#9aa0a6;">If this wasn't you, you can safely ignore this email. Nothing about your account has changed.</p>
    </div>
  </body>
</html>`,
  });

  if (!result.sent && result.reason !== "not-configured") {
    console.error(
      `[send-password-reset-unavailable-email] Could not send to ${user.email}: ${result.reason}`,
    );
  }

  return result;
}
