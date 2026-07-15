import Link from "next/link";
import { PawMark } from "@/components/brand/paw-mark";
import { Wordmark } from "@/components/brand/wordmark";

// FR-010: About/Privacy/Terms point at Admin Content Pages' (021) real
// seeded system pages (scripts/seed-system-pages.ts's own bare-slug
// convention). Community Guidelines/Careers/Safety Center point at
// plain custom-page slugs this feature does NOT seed itself -- an
// as-yet-uncreated slug shows Content Page's (014) existing not-found
// behavior, same as any other not-yet-created custom page.
export function LandingFooter() {
  return (
    <div className="border-t border-border bg-bg">
      <div className="mx-auto grid max-w-275 gap-8 px-6 py-11 sm:px-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <PawMark size={26} />
            <Wordmark className="text-base" />
          </div>
          <p className="max-w-60 text-[13px] leading-relaxed text-text-dim">
            Find people to play anything with. Assemble your party.
          </p>
        </div>
        <div>
          <div className="mb-3 font-mono text-[10px] tracking-wide text-text-dim uppercase">Product</div>
          <div className="flex flex-col gap-2.25 text-[13px]">
            <Link href="/browse" className="text-text-muted">
              Browse
            </Link>
            <span className="text-text-dim">Groups (soon)</span>
            <Link href="/forum" className="text-text-muted">
              Forum
            </Link>
            <Link href="/news" className="text-text-muted">
              News
            </Link>
          </div>
        </div>
        <div>
          <div className="mb-3 font-mono text-[10px] tracking-wide text-text-dim uppercase">Company</div>
          <div className="flex flex-col gap-2.25 text-[13px]">
            <Link href="/pages/about" className="text-text-muted">
              About
            </Link>
            <Link href="/pages/careers" className="text-text-muted">
              Careers
            </Link>
            <Link href="/pages/community-guidelines" className="text-text-muted">
              Community Guidelines
            </Link>
          </div>
        </div>
        <div>
          <div className="mb-3 font-mono text-[10px] tracking-wide text-text-dim uppercase">Legal</div>
          <div className="flex flex-col gap-2.25 text-[13px]">
            <Link href="/pages/privacy" className="text-text-muted">
              Privacy
            </Link>
            <Link href="/pages/terms" className="text-text-muted">
              Terms
            </Link>
            <Link href="/pages/safety-center" className="text-text-muted">
              Safety Center
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-275 flex-wrap items-center justify-between gap-2.5 px-6 py-4.5 font-mono text-[11px] text-text-dim sm:px-10">
          <span>© 2026 playm8z · Discord integration coming soon</span>
          <span>Made for gamers, by gamers</span>
        </div>
      </div>
    </div>
  );
}
