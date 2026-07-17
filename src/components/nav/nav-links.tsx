"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const LINKS: NavItem[] = [
  { href: "/browse", label: "Browse" },
  { href: "/forum", label: "Forum" },
  { href: "/news", label: "News" },
];

// The `about` system page (scripts/seed-system-pages.ts) is deliberately
// promoted out of the "Pages" dropdown to its own top-level item -- the
// dropdown lists custom (non-`system`) pages only, so the two can never
// double up on the same slug.
const ABOUT: NavItem = { href: "/pages/about", label: "About" };

// Every real /admin/* sub-page (Dashboard first, since the trigger
// itself is now a dropdown, not a direct link) -- the admin sidebar
// shown in every wireframe was deferred as Design System infra across
// all 9 admin features that shipped, so before this menu existed the
// only ways into most of these were the Dashboard's own "Needs
// attention" cards (reports/postings/forum only) or typing the URL.
const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/postings", label: "Postings" },
  { href: "/admin/forum", label: "Forum" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/content-pages", label: "Content pages" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

// Groups is deliberately omitted (ADR: no curated Group entity exists
// yet, product vision defers it) even though sitemap.md's nav line
// still lists it -- same "encode the decision, not the stale doc"
// precedent as the age-policy/hard-deletes ADRs.
export function NavLinks({ role, pages = [] }: { role?: string | null; pages?: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main" className="ml-4 hidden items-center gap-1 sm:flex">
      {LINKS.map((link) => (
        <NavLink key={link.href} item={link} active={isActive(link.href)} />
      ))}

      {/* Hidden entirely when no custom pages exist rather than opening
          onto an empty menu -- a brand-new deployment has only the three
          system pages. */}
      {pages.length > 0 && (
        <NavDropdown label="Pages" items={pages} active={pages.some((page) => isActive(page.href))} />
      )}

      <NavLink item={ABOUT} active={isActive(ABOUT.href)} />

      {/* Admin-only (not moderator+) -- every /admin/* page still gates
          itself independently via require-role.ts, this just controls
          whether it's discoverable in the nav. */}
      {role === "admin" && <NavDropdown label="Admin" items={ADMIN_LINKS} active={isActive("/admin")} />}
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "text-text" : "text-text-muted"}`}
    >
      {item.label}
    </Link>
  );
}

// Same disclosure-widget pattern as profile-menu.tsx/notification-
// bell.tsx (click-outside + Escape both dismiss, aria-haspopup/
// aria-expanded). Each instance owns its own open state, so opening one
// dropdown leaves any other one alone.
function NavDropdown({ label, items, active }: { label: string; items: NavItem[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${active ? "text-text" : "text-text-muted"}`}
      >
        {label}
        {/* Decorative: aria-hidden keeps the accessible name a clean
            "Pages"/"Admin" rather than "Pages ▾", and stops screen
            readers announcing the glyph -- aria-expanded already conveys
            the open/closed state. */}
        <span aria-hidden="true" className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute top-11 left-0 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-text-muted hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
