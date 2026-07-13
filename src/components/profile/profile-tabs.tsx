"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/profile", label: "Overview" },
  { href: "/profile/postings", label: "My postings" },
  { href: "/profile/saved", label: "Saved" },
  { href: "/profile/account", label: "Account" },
] as const;

export function ProfileTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Profile sections" className="mt-6.5 flex gap-1">
      {TABS.map((tab) => {
        const isActive = tab.href === "/profile" ? pathname === "/profile" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-t-lg border border-b-0 border-border bg-bg px-4 py-2.5 text-sm font-bold text-text"
                : "rounded-t-lg border border-transparent px-4 py-2.5 text-sm font-medium text-text-dim"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
