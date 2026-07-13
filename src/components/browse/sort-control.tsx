"use client";

import { useBrowseUrlParams } from "@/lib/hooks/use-browse-url-params";

const SORT_OPTIONS = [
  { key: "recent", label: "Recent" },
  { key: "seats", label: "Open seats" },
  { key: "soon", label: "Soonest" },
];

// FR-013.
export function SortControl() {
  const { searchParams, setSingle } = useBrowseUrlParams();
  const sort = searchParams.get("sort") ?? "recent";

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-wider text-text-muted uppercase">Sort</span>
      {SORT_OPTIONS.map((option) => {
        const active = sort === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => setSingle("sort", option.key, "recent")}
            className={
              active
                ? "rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-xs font-bold text-on-accent"
                : "rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-text"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
