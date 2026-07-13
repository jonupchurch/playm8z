export type TrendingGame = { game: string; count: number };

// FR-007/FR-008: top games by current open-posting count, recalculated
// per page load. Selecting one narrows the Live LFG feed via the same
// search-match logic live-feed.tsx already has (research.md #1) --
// not a separate filter dimension.
export function TrendingRow({
  trending,
  onSelect,
}: {
  trending: TrendingGame[];
  onSelect: (game: string) => void;
}) {
  if (trending.length === 0) return null;

  return (
    <section className="mx-auto mb-2 max-w-[1180px] px-8">
      <h2 className="mb-4 font-mono text-[11px] tracking-wider text-accent-2 uppercase">
        Trending now
      </h2>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {trending.map((entry) => (
          <button
            key={entry.game}
            type="button"
            onClick={() => onSelect(entry.game)}
            className="overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors hover:border-accent-2/50"
          >
            <div className="h-16 bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-2))]" />
            <div className="p-3">
              <div className="mb-2 text-sm leading-tight font-bold text-text">{entry.game}</div>
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="font-mono text-[11px] text-text-muted">{entry.count} open</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
