import Link from "next/link";
import type { GenreCount } from "@/lib/landing/get-landing-stats";

const BAR_GRADIENTS = [
  "linear-gradient(90deg,var(--color-accent),var(--color-accent-2))",
  "linear-gradient(90deg,var(--color-accent-2),var(--color-pop))",
  "linear-gradient(90deg,var(--color-accent),var(--color-pop))",
  "linear-gradient(90deg,var(--color-pop),var(--color-accent-2))",
];

// FR-006/research.md #7: each of Browse's (004) real 8 genres, with
// its real, current open-posting count -- the same GROUP BY pattern
// Home's (003) own "Trending now" row already established.
export function LandingGenres({ genreCounts }: { genreCounts: GenreCount[] }) {
  return (
    <div className="mx-auto max-w-275 px-6 py-20 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-3 font-mono text-[11px] tracking-[0.28em] text-accent-2 uppercase">
            Something for everyone
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by genre</h2>
        </div>
        <Link href="/browse" className="text-sm font-semibold text-accent-2">
          See all games →
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {genreCounts.map((entry, index) => (
          <Link
            key={entry.genre}
            href={`/browse?genres=${encodeURIComponent(entry.genre)}`}
            className="flex-1 basis-45 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-2/50"
          >
            <div
              style={{ background: BAR_GRADIENTS[index % BAR_GRADIENTS.length] }}
              className="mb-3.5 h-2 w-9 rounded-full"
            />
            <div className="mb-0.5 text-base font-bold text-text">{entry.genre}</div>
            <div className="font-mono text-[11px] text-text-dim">{entry.count.toLocaleString()} live parties</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
