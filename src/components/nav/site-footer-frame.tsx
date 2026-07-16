"use client";

import { usePathname } from "next/navigation";

// Mirrors site-header-frame.tsx's hide-list: the auth flow's own
// `(auth)/layout.tsx` is a self-contained centered card, and a footer
// below it would be as out of place there as the main nav above it.
// (Maintenance mode is handled in site-footer.tsx itself, for the same
// reason the header does it there -- it's a proxy.ts *rewrite*, not a
// distinct route, so a pathname check here could never catch it.)
const HIDDEN_ON = ["/login", "/signup", "/onboarding", "/continue", "/verify-email"];

export function SiteFooterFrame({
  children,
  hideOnHome,
}: {
  children: React.ReactNode;
  hideOnHome: boolean;
}) {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;
  // "/" serves two different pages: logged-out visitors get the
  // marketing landing, which renders its own richer four-column
  // LandingFooter, so this one would double up. Logged-in visitors get
  // the feed instead, which has no footer of its own -- hence keying on
  // the session rather than the path alone.
  if (hideOnHome && pathname === "/") return null;

  return <footer className="mt-auto border-t border-border bg-bg">{children}</footer>;
}
