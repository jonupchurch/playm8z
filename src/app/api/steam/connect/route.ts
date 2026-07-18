import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { appUrl } from "@/lib/email/app-url";
import { buildAuthUrl } from "@/lib/steam/steam-openid";

// FR-001/FR-002: start the Steam OpenID handshake. Requires a session (this
// links to an existing account and is never a way to sign in). Sets a
// short-lived CSRF `state` cookie carried through `return_to`, then redirects
// to Steam. Uses appUrl() so the realm/return are correct in prod, not
// localhost.
export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.redirect(`${appUrl()}/login`);
  }

  const base = appUrl();
  const state = crypto.randomUUID();
  const returnTo = `${base}/api/steam/callback?state=${state}`;

  const res = NextResponse.redirect(buildAuthUrl(returnTo, base));
  res.cookies.set("steam_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // survives the top-level GET redirect back from Steam
    path: "/",
    maxAge: 600,
  });
  return res;
}
