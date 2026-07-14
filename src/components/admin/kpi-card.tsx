function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// FR-002: five of these render each KPI's own current, direct count
// (SC-001) -- `alert` is purely a styling hint for values worth
// drawing the eye to (e.g. a nonzero open-reports count), not a
// separate data source.
export function KpiCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-surface-2 p-4.5 ${alert ? "border-pop-text/30" : "border-border"}`}>
      <div className="mb-2 font-mono text-[10px] tracking-wider text-text-dim uppercase">{label}</div>
      <div className={`text-2xl leading-none font-bold ${alert ? "text-pop-text" : "text-text"}`}>
        {formatCount(value)}
      </div>
    </div>
  );
}
