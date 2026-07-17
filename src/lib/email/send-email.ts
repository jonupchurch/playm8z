import { Resend } from "resend";

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: string }
  | { sent: false; reason: "not-configured"; logged: string };

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Always supply a plaintext part -- a body-less text/plain scores as spam. */
  text: string;
  /**
   * Resend idempotency key, `<event-type>/<entity-id>`, max 256 chars.
   * Same key + same payload replays the original response instead of
   * sending twice; same key + *different* payload is a 409. So key it on
   * something that changes when the mail genuinely changes -- a one-shot
   * token, not a user id (a re-send request carries a new token, and must
   * actually go out).
   */
  idempotencyKey: string;
}

/**
 * The single outbound-email path. Both the Resend client and the
 * no-provider fallback live here so callers never branch on config.
 *
 * Deliberately never throws and never returns void:
 *
 * - Never throws, because every caller writes to the database *before*
 *   sending (a user row, a token row). A throw here would 500 a request
 *   whose real work already committed -- the account exists, the caller
 *   sees a failure, and a retry hits "email already registered".
 * - Never returns void, because Resend's SDK does not throw on API errors
 *   either -- it returns `{ data, error }`. A `Promise<void>` wrapper
 *   would swallow that silently and report success by saying nothing,
 *   which is the exact invisible-failure shape this replaces.
 *
 * The caller decides what a failure means; this only reports it.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // No provider configured: local dev, CI, and any test that doesn't mock
  // this module. Logging the body keeps those flows fully exercisable
  // without a secret, which is what `.env.example` has always promised.
  // A missing key in *production* is a real misconfiguration, so say so
  // loudly there rather than quietly logging and moving on.
  if (!apiKey) {
    if (process.env.VERCEL_ENV === "production") {
      console.error(
        `[send-email] RESEND_API_KEY is not set in production -- "${options.subject}" to ${options.to} was NOT sent.`,
      );
      return { sent: false, reason: "RESEND_API_KEY is not set." };
    }
    console.log(`[send-email] No RESEND_API_KEY; not sending.\nTo: ${options.to}\nSubject: ${options.subject}\n${options.text}`);
    return { sent: false, reason: "not-configured", logged: options.text };
  }

  const from = fromAddress();
  if (!from) {
    console.error("[send-email] Neither EMAIL_FROM nor RESEND_EMAIL_DOMAIN is set -- cannot choose a sender.");
    return { sent: false, reason: "No sender address configured." };
  }

  let result;
  try {
    result = await new Resend(apiKey).emails.send(
      { from, to: [options.to], subject: options.subject, html: options.html, text: options.text },
      { idempotencyKey: options.idempotencyKey },
    );
  } catch (err) {
    // Resend's SDK reports *API* errors through `error` below, not by
    // throwing -- so reaching here means something lower-level broke
    // (DNS, socket, a thrown non-Error). Still must not propagate.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[send-email] Transport failure sending "${options.subject}" to ${options.to}: ${reason}`);
    return { sent: false, reason };
  }

  // The gotcha: this is an error *return*, not an exception. try/catch
  // alone would sail straight past it.
  if (result.error) {
    console.error(
      `[send-email] Resend rejected "${options.subject}" to ${options.to}: ${result.error.message}`,
    );
    return { sent: false, reason: result.error.message };
  }

  if (!result.data) {
    console.error(`[send-email] Resend returned neither data nor error for "${options.subject}" to ${options.to}.`);
    return { sent: false, reason: "Resend returned no id." };
  }

  return { sent: true, id: result.data.id };
}

/**
 * Resend 403s if the `from` domain isn't *exactly* a verified domain --
 * we verified `send.playm8z.net`, so `noreply@playm8z.net` would fail.
 * Deriving from `RESEND_EMAIL_DOMAIN` (which the Vercel integration
 * provisions itself, and which by construction holds the domain that was
 * actually verified) keeps the sender from drifting off the verified
 * domain. `EMAIL_FROM` stays an override for local experiments; set it
 * and you own the match.
 */
function fromAddress(): string | null {
  const override = process.env.EMAIL_FROM;
  if (override) return override;

  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!domain) return null;

  return `playm8z <noreply@${domain}>`;
}
