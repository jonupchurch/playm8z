"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/forum", label: "Forum" },
  { href: "/news", label: "News" },
];

// Groups is deliberately omitted (ADR: no curated Group entity exists
// yet, product vision defers it) even though sitemap.md's nav line
// still lists it -- same "encode the decision, not the stale doc"
// precedent as the age-policy/hard-deletes ADRs.
export function NavLinks() {
  const pathname = usePathname();

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
    </div>
  );
}
