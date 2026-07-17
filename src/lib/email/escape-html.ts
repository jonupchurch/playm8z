/**
 * Escapes a value for interpolation into an email's HTML body.
 *
 * Two distinct callers, both non-obvious:
 *
 * - **User-supplied text** (a display name) lands in an HTML document we
 *   send to someone. Same reasoning as any other template.
 * - **Our own URLs.** These are url-encoded, not html-encoded, so the `&`
 *   separating query params is an unterminated entity inside an `href`.
 *   The link still usually works, which is exactly why this is easy to
 *   miss and worth centralising.
 *
 * Extracted from send-verification-email.ts when password reset (033)
 * became the second sender needing it.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
