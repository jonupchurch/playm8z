import type { TopGame } from "@/lib/admin/get-top-games";

// FR-004/SC-004: ranked by current open-posting count, most first --
// research.md #4 reuses Home's/Browse's own established "which games
// have the most open postings right now" query.
export function TopGames({ games }: { games: TopGame[] }) {
  const max = games[0]?.count ?? 1;
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-bold text-text">Top games today</div>
        <span className="font-mono text-[10px] text-text-dim">by open parties</span>
      </div>
      {games.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-dim">No open postings yet.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {games.map((g) => (
            <div key={g.game}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text">{g.game}</span>
                <span className="font-mono text-[11px] text-text-muted">{g.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  style={{ width: `${Math.round((g.count / max) * 100)}%` }}
                  className="h-full rounded-full bg-[linear-gradient(120deg,var(--color-accent-2),var(--color-accent))]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
