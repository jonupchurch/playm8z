"use client";

import { useEffect, useRef, useState } from "react";
import { NEWS_CATEGORIES } from "@/lib/validations/news";
import { useNewsUrlParams } from "@/lib/hooks/use-news-url-params";

function CategoryChip({ active, label, onSelect }: { active: boolean; label: string; onSelect: () => void }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="news-category" checked={active} onChange={onSelect} className="peer sr-only" />
      <span className="rounded-lg border border-border bg-surface-2 px-3.5 py-2 font-mono text-[11px] font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

// Debounced (Browse/Forum's precedent) so a fast typist doesn't trigger
// a server round-trip per keystroke. Keyed by the URL's own `q` so an
// external change (e.g. a category chip clearing it) correctly resets
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
    <div className="flex min-w-55 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5">
      <label htmlFor="news-search" className="sr-only">
        Search news
      </label>
      <input
        id="news-search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search news…"
        className="w-full bg-transparent py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
      />
    </div>
  );
}

export function NewsControls() {
  const { searchParams, setCategory, setQuery } = useNewsUrlParams();
  const category = searchParams.get("category") ?? "all";
  const q = searchParams.get("q") ?? "";

  return (
    <div className="mb-6.5 flex flex-wrap items-center justify-between gap-4">
      <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
        <CategoryChip active={category === "all"} label="All" onSelect={() => setCategory("all")} />
        {NEWS_CATEGORIES.map((cat) => (
          <CategoryChip key={cat} active={category === cat} label={cat} onSelect={() => setCategory(cat)} />
        ))}
      </div>
      <SearchInput key={q} initialQuery={q} onQueryChange={setQuery} />
    </div>
  );
}
