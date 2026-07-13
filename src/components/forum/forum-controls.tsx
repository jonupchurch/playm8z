"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/forum/categories";
import { useForumUrlParams } from "@/lib/hooks/use-forum-url-params";

const SORTS = [
  { key: "latest", label: "Latest" },
  { key: "top", label: "Top" },
  { key: "unanswered", label: "Unanswered" },
] as const;

function CategoryChip({
  active,
  label,
  dot,
  count,
  onSelect,
}: {
  active: boolean;
  label: string;
  dot: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="forum-category" checked={active} onChange={onSelect} className="peer sr-only" />
      <span className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13px] font-semibold text-text-muted peer-checked:border-accent-2 peer-checked:bg-surface peer-checked:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        <span aria-hidden style={{ background: dot }} className="h-2 w-2 shrink-0 rounded-full" />
        <span>{label}</span>
        <span className="font-mono text-[10px] opacity-70">{count}</span>
      </span>
    </label>
  );
}

function SortChip({ active, label, onSelect }: { active: boolean; label: string; onSelect: () => void }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="forum-sort" checked={active} onChange={onSelect} className="peer sr-only" />
      <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

// Debounced (Browse's search-header.tsx precedent) so a fast typist
// doesn't trigger a server round-trip per keystroke. Keyed by the URL's
// own `q` value from the parent, so an EXTERNAL change to the search
// term (a trending tag click, FR-006) correctly remounts and resets
// this input's local state instead of going stale.
function SearchInput({ initialQuery, onQueryChange }: { initialQuery: string; onQueryChange: (value: string) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onQueryChange(next), 300);
  }

  return (
    <div className="flex max-w-70 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3">
      <label htmlFor="forum-search" className="sr-only">
        Search threads
      </label>
      <input
        id="forum-search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search threads…"
        className="w-full bg-transparent py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim"
      />
    </div>
  );
}

export function ForumControls({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  const { searchParams, setCategory, setSort, setQuery } = useForumUrlParams();
  const category = searchParams.get("category") ?? "all";
  const sort = searchParams.get("sort") ?? "latest";
  const q = searchParams.get("q") ?? "";
  const totalCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <div role="radiogroup" aria-label="Category" className="mb-5 flex flex-wrap gap-2.5">
        <CategoryChip
          active={category === "all"}
          label="All"
          dot="#fbeeda"
          count={totalCount}
          onSelect={() => setCategory("all")}
        />
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.key}
            active={category === cat.key}
            label={cat.label}
            dot={cat.dot}
            count={categoryCounts[cat.key] ?? 0}
            onSelect={() => setCategory(cat.key)}
          />
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput key={q} initialQuery={q} onQueryChange={setQuery} />
        <div role="radiogroup" aria-label="Sort" className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-text-dim uppercase">Sort</span>
          {SORTS.map((option) => (
            <SortChip
              key={option.key}
              active={sort === option.key}
              label={option.label}
              onSelect={() => setSort(option.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
