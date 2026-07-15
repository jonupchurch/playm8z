import { NextResponse, type NextRequest } from "next/server";
import { getSettings } from "@/lib/settings/get-settings";
import { getCurrentRole, ROLE_RANK } from "@/lib/auth/require-role";

// Maintenance short-circuit (FR-009/FR-010/FR-012). /admin/* is never
// intercepted here regardless of session -- each admin page is
// responsible for its own require-role.ts gate either way, so a
// non-moderator hitting /admin/* during maintenance still gets that
// page's normal 401/403, not the maintenance page.
//
// Admin Settings (024)/spec.md's own Scenario 1: "an admin session is
// unaffected" -- read as sitewide, not just /admin/* (which was already
// exempt above). An admin session keeps full, normal access to every
// route while maintenance mode is on. /login is also exempt -- an admin
// who isn't currently logged in (a different browser, an expired
// session) has no session yet on this very request, so the admin-bypass
// check below can't apply to it; without this exemption the login form
// itself would be replaced by the maintenance page, permanently locking
// out anyone not already signed in (found while e2e-testing this
// feature's own admin bypass).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname === "/maintenance" || pathname === "/login") {
    return NextResponse.next();
  }

  const settings = await getSettings();
  if (!settings.maintenanceMode) {
    return NextResponse.next();
  }

  const role = await getCurrentRole();
  if (role && ROLE_RANK[role] >= ROLE_RANK.admin) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url, { status: 503 });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
