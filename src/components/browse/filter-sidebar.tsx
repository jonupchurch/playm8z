"use client";

import { PLATFORMS, TIME_SLOTS } from "@/lib/validations/browse-filters";
import { useBrowseUrlParams } from "@/lib/hooks/use-browse-url-params";
import type { FacetCount } from "@/lib/postings/get-facet-counts";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Mornings",
  afternoon: "Afternoons",
  evening: "Evenings",
  late: "Late night",
  weekend: "Weekends",
};

const PLATFORM_LABELS: Record<string, string> = {
  any: "Any",
  pc: "PC",
  console: "Console",
  cross: "Cross-play",
  table: "Tabletop",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
      {children}
    </div>
  );
}

function Segment({
  name,
  value,
  active,
  label,
  onSelect,
}: {
  name: string;
  value: string;
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

function Chip({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        checked={active}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

function CheckRow({
  active,
  label,
  count,
  onToggle,
}: {
  active: boolean;
  label: string;
  count: number;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-0.5 py-1.5 hover:bg-surface-2">
      <input
        type="checkbox"
        checked={active}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-accent-2"
      />
      <span className="flex-1 text-[13px] text-text">{label}</span>
      <span className="font-mono text-[10px] text-text-dim">{count}</span>
    </label>
  );
}

export function FilterSidebar({
  gameFacets,
  regionFacets,
  genres,
}: {
  gameFacets: FacetCount[];
  regionFacets: FacetCount[];
  // Admin-editable (030). Arrives as a prop from the Browse page rather
  // than being imported: a client component importing a runtime value
  // from a module that reaches @/db crashes the page.
  genres: string[];
}) {
  const { searchParams, setSingle, toggleMulti, clearAll } = useBrowseUrlParams();

  const vibe = searchParams.get("vibe") ?? "any";
  const ageGroup = searchParams.get("ageGroup") ?? "any";
  const openSlots = searchParams.get("openSlots") ?? "any";
  const platform = searchParams.get("platform") ?? "any";
  const micRequired = searchParams.get("micRequired") === "true";
  const activeGames = searchParams.getAll("games");
  const activeGenres = searchParams.getAll("genres");
  const activeRegions = searchParams.getAll("regions");
  const activeSlots = searchParams.getAll("timeSlots");

  return (
    <aside className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-border bg-surface-2 p-5">
      <div className="mb-4.5 flex items-center justify-between">
        <h2 className="text-base font-bold text-text">Filters</h2>
        <button
          type="button"
          onClick={clearAll}
          className="font-mono text-xs font-bold text-accent-2"
        >
          Clear all
        </button>
      </div>

      <div className="mb-5">
        <SectionLabel>Casual vs serious</SectionLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vibe">
          <Segment name="vibe" value="any" active={vibe === "any"} label="Any" onSelect={() => setSingle("vibe", "any")} />
          <Segment name="vibe" value="fun" active={vibe === "fun"} label="Casual" onSelect={() => setSingle("vibe", "fun")} />
          <Segment name="vibe" value="serious" active={vibe === "serious"} label="Serious" onSelect={() => setSingle("vibe", "serious")} />
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Game</SectionLabel>
        <div className="flex flex-col">
          {gameFacets.map((facet) => (
            <CheckRow
              key={facet.value}
              label={facet.value}
              count={facet.count}
              active={activeGames.includes(facet.value)}
              onToggle={() => toggleMulti("games", facet.value)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Genre</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              active={activeGenres.includes(genre)}
              onToggle={() => toggleMulti("genres", genre)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Location / region</SectionLabel>
        <div className="flex flex-col">
          {regionFacets.map((facet) => (
            <CheckRow
              key={facet.value}
              label={REGION_LABELS[facet.value] ?? facet.value}
              count={facet.count}
              active={activeRegions.includes(facet.value)}
              onToggle={() => toggleMulti("regions", facet.value)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>When they play</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {TIME_SLOTS.map((slot) => (
            <Chip
              key={slot}
              label={TIME_SLOT_LABELS[slot]}
              active={activeSlots.includes(slot)}
              onToggle={() => toggleMulti("timeSlots", slot)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Age group</SectionLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age group">
          <Segment name="ageGroup" value="any" active={ageGroup === "any"} label="Any" onSelect={() => setSingle("ageGroup", "any")} />
          <Segment name="ageGroup" value="18" active={ageGroup === "18"} label="18+" onSelect={() => setSingle("ageGroup", "18")} />
          <Segment name="ageGroup" value="21" active={ageGroup === "21"} label="21+" onSelect={() => setSingle("ageGroup", "21")} />
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Open slots</SectionLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Open slots">
          {["any", "1", "2", "3"].map((option) => (
            <Segment
              key={option}
              name="openSlots"
              value={option}
              active={openSlots === option}
              label={option === "any" ? "Any" : `${option}+`}
              onSelect={() => setSingle("openSlots", option)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4.5 border-t border-border pt-4">
        <SectionLabel>Platform</SectionLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Platform">
          {PLATFORMS.map((option) => (
            <Segment
              key={option}
              name="platform"
              value={option}
              active={platform === option}
              label={PLATFORM_LABELS[option]}
              onSelect={() => setSingle("platform", option)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={micRequired}
            onChange={() =>
              setSingle("micRequired", micRequired ? "false" : "true", "false")
            }
            className="h-4 w-4 shrink-0 accent-accent-2"
          />
          <span className="text-[13px] text-text">Mic required only</span>
        </label>
      </div>
    </aside>
  );
}
