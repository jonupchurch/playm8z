import { NextResponse, type NextRequest } from "next/server";
import { getSettings } from "@/lib/settings/get-settings";

// Maintenance short-circuit (FR-009/FR-010/FR-012). /admin/* is never
// intercepted here regardless of session -- each admin page is
// responsible for its own require-role.ts gate either way, so a
// non-moderator hitting /admin/* during maintenance still gets that
// page's normal 401/403, not the maintenance page.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname === "/maintenance") {
    return NextResponse.next();
  }

  const settings = await getSettings();
  if (!settings.maintenanceMode) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url, { status: 503 });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
