import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { appUrl } from "@/lib/email/app-url";
import { verifyAssertion } from "@/lib/steam/steam-openid";
import { linkSteamAccount } from "@/lib/steam/link-steam-account";
import { steamCallbackSchema } from "@/lib/validations/steam";

const ACCOUNT = "/profile/account";

// FR-002: the return from Steam. Every `openid.*` param is attacker-controlled
// and is NOT trusted until verifyAssertion() confirms it with Steam. On a
// genuine assertion, links the SteamID to the session user (refusing a
// SteamID already on another account). Always ends in a redirect back to
// account settings with a status; never renders.
export async function GET(request: NextRequest) {
  let user: { id: string };
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.redirect(`${appUrl()}/login`);
  }

  const back = (status: string) => {
    const res = NextResponse.redirect(`${appUrl()}${ACCOUNT}?steam=${status}`);
    res.cookies.delete("steam_state");
    return res;
  };

  const url = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams) params[key] = value;

  // CSRF: the state echoed back through return_to must match the cookie.
  const state = url.searchParams.get("state");
  const expected = request.cookies.get("steam_state")?.value;
  if (!state || !expected || state !== expected) return back("verify-failed");

  // Shape gate (the real gate is the verification below).
  if (!steamCallbackSchema.safeParse(params).success) return back("verify-failed");

  const steamId = await verifyAssertion(params);
  if (!steamId) return back("verify-failed");

  const result = await linkSteamAccount(user.id, steamId);
  return back(result === "linked" ? "connected" : "already-linked");
}
