import { escapeHtml } from "@/lib/email/escape-html";

/**
 * The shared HTML shell for every outbound email.
 *
 * Exists because of a real bug (2026-07-16, caught by the user forwarding a
 * screenshot of a live send). All three emails were hand-rolled as
 * `<body style=...><div style="max-width:480px;margin:0 auto">`, and in
 * Gmail the content rendered jammed against the RIGHT edge with a wide
 * empty gutter on the left. Two causes, both classic:
 *
 * 1. **No `dir`.** The markup set `<html lang="en">` and nothing else.
 *    Clients strip attributes off `<html>`, which leaves direction to be
 *    inferred -- and an inferred RTL right-aligns everything. The fix is to
 *    set `lang`/`dir` on `<html>` AND on the direct children of `<body>`,
 *    because the `<html>` copy is the one that gets thrown away. This is
 *    reportedly the single most common accessibility failure in production
 *    email, and it is invisible until someone shows you a screenshot.
 * 2. **`margin: 0 auto` for centering.** Reliable on the web, not in email.
 *    A `<td align="center">` is the bulletproof equivalent and works back
 *    through Outlook.
 *
 * Nothing here can be verified by our tests -- no test renders Gmail. Treat
 * changes to this file as needing a real send to a real inbox.
 */
export function emailLayout({
  title,
  contentHtml,
}: {
  /** Read by clients and screen readers before anything else. Should say what
   *  this specific email is -- effectively the subject, not the brand name. */
  title: string;
  contentHtml: string;
}): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f1115;">
    <!-- lang/dir repeated here deliberately: the copy on <html> above is the
         one clients strip. This is the one that survives. -->
    <div lang="en" dir="ltr" style="background:#0f1115;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f1115;border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="width:480px;max-width:100%;border-collapse:collapse;">
              <tr>
                <td dir="ltr" style="text-align:left;color:#e8eaed;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.5;">
${contentHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

/** A body paragraph. Callers escape their own interpolations. */
export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;color:#e8eaed;">${html}</p>`;
}

/**
 * The primary call-to-action. A real `<a>` with real text -- never a linked
 * image, which would need alt text describing the action and is one more
 * thing to get wrong.
 *
 * The label must describe the destination on its own: a screen-reader user
 * often hears only the link text, with none of the surrounding sentence.
 * "Go to login" is borderline; "Go to the playm8z login page" stands alone.
 */
export function emailButton(href: string, label: string): string {
  return `<p style="margin:0 0 24px;">
  <a href="${escapeHtml(href)}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:16px;">${escapeHtml(label)}</a>
</p>`;
}

/**
 * The copy-this-link fallback for when the button doesn't render or click.
 *
 * The URL is deliberately NOT wrapped in an `<a>`. A bare URL as link text
 * is unreadable to a screen reader ("h-t-t-p-s-colon-slash-slash...") and
 * says nothing about where it goes; the button above already carries the
 * described link. Most clients auto-link it anyway, so nothing is lost.
 */
export function emailUrlFallback(url: string): string {
  return `<p style="margin:0 0 8px;font-size:13px;color:#9aa0a6;">Or copy this address into your browser:</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#a48bff;">${escapeHtml(url)}</p>`;
}
