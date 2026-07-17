/**
 * The site's canonical, absolute base URL -- for links that leave the app
 * and come back, i.e. links in emails. In-app navigation uses relative
 * paths and must not come through here.
 *
 * This exists because of a real bug (2026-07-16). The verification email
 * built its link from `process.env.NEXTAUTH_URL ?? "http://localhost:3000"`,
 * and `NEXTAUTH_URL` was never set anywhere -- not in Vercel, not in
 * `.env.example`, not in any code but that one expression. So the fallback
 * always won and every link pointed at localhost. Nothing caught it:
 * locally the fallback is *correct*, and in production the link was only
 * ever console.log'd by the stub sender, so no human ever read one. It
 * would have surfaced the moment real sending switched on -- as a working
 * email containing a dead link, which is worse than sending nothing.
 *
 * Hence the ordering below, and hence `APP_URL` being set explicitly in
 * Vercel rather than left to inference.
 */
const LOCAL_FALLBACK = "http://localhost:3000";

export function appUrl(): string {
  // Explicit wins. An address that gets baked into mail a user reads
  // days later should be stated, not deduced.
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  // Vercel's canonical production domain for the project -- stable across
  // deployments. Deliberately NOT `VERCEL_URL`, which is the *per-
  // deployment* host: that would bake an ephemeral preview URL into an
  // email that outlives the deployment it was sent from.
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;

  // Reaching the localhost fallback in production is never right, and it
  // is the precise shape of the original bug -- so say so where someone
  // will see it, instead of quietly handing back a dead link again.
  // Deliberately not a throw: the callers have already committed a user
  // row and a token row, and failing their request over a bad link would
  // trade a broken email for a broken sign-up.
  if (process.env.VERCEL_ENV) {
    console.error(
      `[app-url] Neither APP_URL nor VERCEL_PROJECT_PRODUCTION_URL is set on VERCEL_ENV=${process.env.VERCEL_ENV} -- falling back to ${LOCAL_FALLBACK}. Any link built from this is dead.`,
    );
  }

  return LOCAL_FALLBACK;
}
