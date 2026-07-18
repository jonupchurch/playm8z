// Loopback forms that mean "no real remote client" (local dev, the e2e
// suite, CI) -- never a public client behind Vercel's edge.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * The real remote client IP for rate-limit bucketing (ADR 0020), or `null`
 * when we can't identify one.
 *
 * On Vercel the client IP is the first entry of `x-forwarded-for` (the
 * platform sets it at the edge and a client cannot strip or forge past it);
 * `x-real-ip` is a fallback. Returns `null` when neither header is present
 * or the address is loopback -- i.e. local dev, the Playwright e2e suite,
 * and CI, where there is no meaningful per-client identity and every request
 * would otherwise pile into one shared bucket and throttle the whole test
 * run. Production traffic always carries a forwarded IP, so it is always
 * limited; callers simply skip the limiter when this returns `null`.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim() || "";
  if (!candidate || LOOPBACK.has(candidate)) return null;
  return candidate;
}
