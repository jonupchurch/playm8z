// FR-003/research.md #1: three real, currently-accurate numbers --
// deliberately three, not the wireframe's four. "Avg teammate rating"
// is dropped entirely (Public Profile's, 022, Review entity has no
// writer yet) rather than shown as a placeholder/"coming soon" value.
export function LandingTrustBar({
  totalPlayers,
  gamesAndTables,
  partiesFormedThisWeek,
}: {
  totalPlayers: number;
  gamesAndTables: number;
  partiesFormedThisWeek: number;
}) {
  const stats = [
    { value: totalPlayers.toLocaleString(), label: "players" },
    { value: gamesAndTables.toLocaleString(), label: "games & tables" },
    { value: partiesFormedThisWeek.toLocaleString(), label: "parties formed this week" },
  ];

  return (
    <div className="border-t border-b border-border bg-surface-2/50">
      <div className="mx-auto flex max-w-250 flex-wrap justify-around gap-5 px-6 py-6 text-center sm:px-10">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="bg-[linear-gradient(120deg,var(--color-accent),var(--color-pop))] bg-clip-text text-3xl font-bold text-transparent">
              {stat.value}
            </div>
            <div className="font-mono text-[11px] text-text-dim">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
