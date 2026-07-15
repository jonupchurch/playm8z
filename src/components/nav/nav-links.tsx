"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/forum", label: "Forum" },
  { href: "/news", label: "News" },
];

// Every real /admin/* sub-page (Dashboard first, since the trigger
// itself is now a dropdown, not a direct link) -- the admin sidebar
// shown in every wireframe was deferred as Design System infra across
// all 9 admin features that shipped, so before this menu existed the
// only ways into most of these were the Dashboard's own "Needs
// attention" cards (reports/postings/forum only) or typing the URL.
const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/postings", label: "Postings" },
  { href: "/admin/forum", label: "Forum" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/content-pages", label: "Content pages" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

// Groups is deliberately omitted (ADR: no curated Group entity exists
// yet, product vision defers it) even though sitemap.md's nav line
// still lists it -- same "encode the decision, not the stale doc"
// precedent as the age-policy/hard-deletes ADRs.
export function NavLinks({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Same disclosure-widget pattern as profile-menu.tsx/notification-
  // bell.tsx (click-outside + Escape both dismiss, aria-haspopup/
  // aria-expanded).
  useEffect(() => {
    if (!adminOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAdminOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [adminOpen]);

  const isAdminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <div className="ml-4 hidden items-center gap-1 sm:flex">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "text-text" : "text-text-muted"}`}
          >
            {link.label}
          </Link>
        );
      })}

      {/* Admin-only (not moderator+) -- every /admin/* page still gates
          itself independently via require-role.ts, this just controls
          whether it's discoverable in the nav. */}
      {role === "admin" && (
        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setAdminOpen((value) => !value)}
            aria-haspopup="true"
            aria-expanded={adminOpen}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${isAdminActive ? "text-text" : "text-text-muted"}`}
          >
            Admin
            <span className={`text-[10px] transition-transform ${adminOpen ? "rotate-180" : ""}`}>▾</span>
          </button>

          {adminOpen && (
            <div
              role="menu"
              aria-label="Admin"
              className="absolute top-11 left-0 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
            >
              {ADMIN_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setAdminOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text-muted hover:bg-surface"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
