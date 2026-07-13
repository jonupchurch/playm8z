"use client";

import { useMemo, useState } from "react";
import type { OpenPosting } from "@/lib/postings/get-open-postings";
import { ListingCard } from "./listing-card";
import { TrendingRow, type TrendingGame } from "./trending-row";
import { EmptyState } from "./empty-state";

type Vibe = "any" | "fun" | "serious";
type Region = "any" | "na-east" | "na-west" | "eu-west";
type Sort = "recent" | "seats";

const VIBE_OPTIONS: { key: Vibe; label: string }[] = [
  { key: "any", label: "All" },
  { key: "fun", label: "Fun" },
  { key: "serious", label: "Serious" },
];

const REGION_OPTIONS: { key: Region; label: string }[] = [
  { key: "any", label: "Any region" },
  { key: "na-east", label: "NA-East" },
  { key: "na-west", label: "NA-West" },
  { key: "eu-west", label: "EU-West" },
];

const SORT_OPTIONS: { key: Sort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "seats", label: "Open seats" },
];

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 font-mono text-xs font-bold text-on-accent"
    : "rounded-full border border-border bg-surface-2 px-4 py-2 font-mono text-xs font-bold text-text";
}

// Search/filter/sort all run client-side over one already-fetched list
// (research.md #1) -- Home's feed is a small recent slice, not full
// pagination (Browse's job), so no per-keystroke network round trip or
// debounce logic is needed.
export function LiveFeed({
  postings,
  trending,
}: {
  postings: OpenPosting[];
  trending: TrendingGame[];
}) {
  const [query, setQuery] = useState("");
  const [vibe, setVibe] = useState<Vibe>("any");
  const [region, setRegion] = useState<Region>("any");
  const [sort, setSort] = useState<Sort>("recent");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = postings.filter((posting) => {
      const matchesQuery =
        !q || `${posting.game} ${posting.title} ${posting.hostHandle}`.toLowerCase().includes(q);
      const matchesVibe = vibe === "any" || posting.vibe === vibe;
      const matchesRegion = region === "any" || posting.region === region;
      return matchesQuery && matchesVibe && matchesRegion;
    });

    return filtered.sort((a, b) =>
      sort === "seats"
        ? b.seatsOpen - a.seatsOpen
        : b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [postings, query, vibe, region, sort]);

  return (
    <>
      <div className="mx-auto max-w-230 px-8 pb-11">
        <div className="mx-auto flex max-w-150 items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4.5 py-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border-2 border-text-dim"
          />
          <label htmlFor="home-search" className="sr-only">
            Search a game, player, or vibe
          </label>
          <input
            id="home-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a game, player, or vibe…"
            className="flex-1 bg-transparent py-2 text-[15px] text-text placeholder:text-text-dim outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-0.5 font-mono text-[10px] tracking-wider text-text-muted uppercase">
            Vibe
          </span>
          {VIBE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setVibe(option.key)}
              aria-pressed={vibe === option.key}
              className={chipClass(vibe === option.key)}
            >
              {option.label}
            </button>
          ))}
          <span className="mx-1 h-5.5 w-px bg-border" aria-hidden="true" />
          <span className="mr-0.5 font-mono text-[10px] tracking-wider text-text-muted uppercase">
            Region
          </span>
          {REGION_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRegion(option.key)}
              aria-pressed={region === option.key}
              className={chipClass(region === option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <TrendingRow trending={trending} onSelect={(game) => setQuery(game)} />

      <div className="mx-auto max-w-295 px-8 pt-8 pb-18">
        <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-mono text-[11px] tracking-wider text-accent-2 uppercase">
              Live LFG
            </h2>
            <span aria-live="polite" className="font-mono text-[11px] text-text-muted">
              {results.length} open right now
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-text-muted uppercase">
              Sort
            </span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                aria-pressed={sort === option.key}
                className={chipClass(sort === option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((posting) => (
              <ListingCard key={posting.id} posting={posting} />
            ))}
          </div>
        ) : (
          <EmptyState searchTerm={query} />
        )}
      </div>
    </>
  );
}
