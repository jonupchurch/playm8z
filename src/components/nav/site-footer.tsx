import Link from "next/link";
import { auth } from "@/auth";
import { SiteFooterFrame } from "@/components/nav/site-footer-frame";
import { getSettings } from "@/lib/settings/get-settings";

// The three legal system pages (scripts/seed-system-pages.ts). About is
// the fourth system page but it's a top-level nav item instead, so it's
// deliberately not repeated here.
const LEGAL_LINKS = [
  { href: "/pages/terms", label: "Terms of Use" },
  { href: "/pages/privacy", label: "Privacy" },
  { href: "/pages/cookies", label: "Cookies" },
];

export async function SiteFooter() {
  const settings = await getSettings();
  if (settings.maintenanceMode) {
    return null;
  }

  const session = await auth();

  return (
    <SiteFooterFrame hideOnHome={!session?.user}>
      <div className="mx-auto flex max-w-275 flex-wrap items-center justify-between gap-x-6 gap-y-2.5 px-6 py-4.5 font-mono text-[11px] sm:px-10">
        <span className="text-text-dim">© {new Date().getFullYear()} playm8z</span>
        <div className="flex flex-wrap items-center gap-4">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-text-muted">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </SiteFooterFrame>
  );
}
