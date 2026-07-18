// Steam Connect (038, ADR 0012): the Steam OpenID 2.0 handshake, hand-rolled
// as ~two functions — Steam has no OAuth2/Auth.js provider, and this is a
// settings-time account LINK, not a sign-in. The return from Steam is
// attacker-controlled and MUST NOT be trusted until verifyAssertion() has
// echoed it back to Steam and gotten `is_valid:true` (Constitution
// Principle II). The endpoint is overridable via env so tests/e2e can point
// at a fake without hitting real Steam.

const STEAM_OPENID_ENDPOINT = process.env.STEAM_OPENID_ENDPOINT ?? "https://steamcommunity.com/openid/login";

const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** Build the redirect URL that sends the player to Steam to approve the link. */
export function buildAuthUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

/**
 * Verify the assertion Steam returned by echoing every `openid.*` param back
 * with `mode=check_authentication`. Returns the SteamID64 ONLY when Steam
 * replies `is_valid:true`; any tamper, network error, or non-genuine
 * assertion returns null. `params` is untrusted until this returns.
 */
export async function verifyAssertion(
  params: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const match = params["openid.claimed_id"]?.match(CLAIMED_ID_RE);
  if (!match) return null;

  const body = new URLSearchParams({ ...params, "openid.mode": "check_authentication" });
  try {
    const res = await fetchImpl(STEAM_OPENID_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Steam replies with a key/value body; the genuine one contains
    // `is_valid:true`. A forged/expired assertion yields `is_valid:false`.
    const isValid = /(^|\n)is_valid:true\s*($|\n)/.test(text);
    return isValid ? match[1] : null;
  } catch {
    return null;
  }
}
