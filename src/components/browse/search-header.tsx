"use client";

import { useEffect, useRef, useState } from "react";
import { useBrowseUrlParams } from "@/lib/hooks/use-browse-url-params";

// FR-002: narrows results to postings whose game, title, host, blurb,
// or genre matches the text. Debounced (research.md #2) so a fast
// typist doesn't trigger a server round-trip per keystroke; every
// other facet control updates the URL immediately (discrete clicks,
// not a typed stream).
export function SearchHeader() {
  const { searchParams, setQuery } = useBrowseUrlParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(next), 300);
  }

  return (
    <div className="flex max-w-180 items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-1.5">
      <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-text-dim" />
      <label htmlFor="browse-search" className="sr-only">
        Search games, players, keywords
      </label>
      <input
        id="browse-search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search games, players, keywords — e.g. 'chill co-op', 'ranked mic'…"
        className="flex-1 bg-transparent py-2 text-[15px] text-text placeholder:text-text-dim outline-none"
      />
    </div>
  );
}
