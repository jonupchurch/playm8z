"use client";

import { usePathname } from "next/navigation";

// The auth flow's own `(auth)/layout.tsx` already renders its own
// centered logo header -- showing the main site nav above it would
// double up on headers. (Maintenance mode is handled separately, in
// site-header.tsx itself: it's a proxy.ts *rewrite*, not a distinct
// route, so a pathname check here could never catch it.)
const HIDDEN_ON = ["/login", "/signup", "/onboarding", "/continue", "/verify-email"];

export function SiteHeaderFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-6 backdrop-blur-md">
      {children}
    </header>
  );
}
