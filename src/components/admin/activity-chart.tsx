"use client";

import { useState } from "react";
import type { ActivityDay, ActivityMetric } from "@/lib/admin/get-activity-chart";

const METRICS: { key: ActivityMetric; label: string }[] = [
  { key: "signups", label: "Signups" },
  { key: "active", label: "Active" },
  { key: "postings", label: "Postings" },
];

function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// FR-003/plan.md's Constraints: the metric switcher uses real tab
// semantics (role="tablist"/"tab"/aria-selected), and the visual bars
// are aria-hidden in favor of a visually-hidden <table> as the one
// canonical accessible equivalent of the same 7-day data -- not color/
// height alone.
export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const [metric, setMetric] = useState<ActivityMetric>("signups");
  const values = days.map((day) => day[metric]);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const activeLabel = METRICS.find((m) => m.key === metric)!.label;

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold text-text">Activity · last 7 days</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-dim">{formatCount(total)} total this week</div>
        </div>
        <div role="tablist" aria-label="Activity metric" className="flex gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              id={`activity-tab-${m.key}`}
              aria-selected={metric === m.key}
              aria-controls="activity-chart-panel"
              onClick={() => setMetric(m.key)}
              className={
                metric === m.key
                  ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                  : "rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] font-bold text-text"
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div id="activity-chart-panel" role="tabpanel" aria-labelledby={`activity-tab-${metric}`}>
        <div aria-hidden="true" className="flex h-[170px] items-end justify-between gap-3">
          {days.map((day) => {
            const value = day[metric];
            const height = Math.round((value / max) * 150);
            return (
              <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="font-mono text-[10px] text-text-dim">{formatCount(value)}</span>
                <div
                  style={{ height: `${height}px` }}
                  className="w-full max-w-[44px] rounded-t-lg bg-[linear-gradient(180deg,var(--color-accent),var(--color-accent-2))]"
                />
                <span className="font-mono text-[10px] text-text-dim">{day.label}</span>
              </div>
            );
          })}
        </div>

        <table className="sr-only">
          <caption>{activeLabel} per day, last 7 days</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">{activeLabel}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row">{day.label}</th>
                <td>{day[metric]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
