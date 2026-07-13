import Link from "next/link";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { OpenPosting } from "@/lib/postings/get-open-postings";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

export function relativeAge(createdAt: Date, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - createdAt.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// FR-005's fields, plus the decorative "actively recruiting" dot (spec's
// Assumptions: tied to the posting being open, not a real presence
// system -- every card shown here is already status='open').
export function ListingCard({ posting }: { posting: OpenPosting }) {
  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === posting.hostAvatarColor)?.gradient ??
    AVATAR_COLORS[0].gradient;
  const initial = (posting.hostName.trim()[0] || "P").toUpperCase();
  const isSerious = posting.vibe === "serious";

  return (
    <Link
      href={`/listing/${posting.id}`}
      className="flex flex-col rounded-2xl border border-border bg-surface p-4.5 transition-colors hover:border-accent-2/50"
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          style={{ background: avatarGradient }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-on-accent"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text">{posting.hostName}</div>
          <div className="font-mono text-[10px] text-text-muted">
            {relativeAge(posting.createdAt)} · {REGION_LABELS[posting.region] ?? posting.region}
          </div>
        </div>
        <span
          aria-hidden="true"
          title="Actively recruiting"
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"
        />
      </div>

      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent-2">
        {posting.game}
      </div>
      <h3 className="mb-1.5 text-base leading-snug font-bold text-text">{posting.title}</h3>
      <p className="mb-3.5 flex-1 text-[13px] leading-relaxed text-text-muted">{posting.blurb}</p>

      <div className="mb-3.5 flex flex-wrap gap-1.5">
        <span
          className={
            isSerious
              ? "rounded-full border border-pop/40 bg-pop/15 px-2.5 py-1 font-mono text-[11px] font-bold text-pop-text"
              : "rounded-full border border-accent-2/40 bg-accent-2/15 px-2.5 py-1 font-mono text-[11px] font-bold text-accent-2"
          }
        >
          {isSerious ? "Serious" : "Fun"}
        </span>
        <span className="rounded-full border border-text-muted/30 bg-text-muted/10 px-2.5 py-1 font-mono text-[11px] font-bold text-text-muted">
          {posting.seatsOpen}/{posting.seatsTotal} open
        </span>
      </div>

      <span className="mt-auto block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-2.5 text-center text-sm font-bold text-on-accent">
        Request to join
      </span>
    </Link>
  );
}
