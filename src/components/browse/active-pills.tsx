"use client";

import { useBrowseUrlParams } from "@/lib/hooks/use-browse-url-params";

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
  pc: "PC",
  console: "Console",
  cross: "Cross-play",
  table: "Tabletop",
};

type Pill = { key: string; value?: string; label: string };

// FR-015: a removable pill for every active, non-default facet
// selection (each multi-select value gets its own), plus "Clear all."
export function ActivePills() {
  const { searchParams, removeValue, clearAll } = useBrowseUrlParams();

  const pills: Pill[] = [];

  const q = searchParams.get("q");
  if (q) pills.push({ key: "q", label: `"${q}"` });

  const vibe = searchParams.get("vibe");
  if (vibe && vibe !== "any") {
    pills.push({ key: "vibe", label: vibe === "serious" ? "Serious" : "Casual" });
  }

  searchParams.getAll("games").forEach((game) => pills.push({ key: "games", value: game, label: game }));
  searchParams
    .getAll("genres")
    .forEach((genre) => pills.push({ key: "genres", value: genre, label: genre }));
  searchParams
    .getAll("regions")
    .forEach((region) =>
      pills.push({ key: "regions", value: region, label: REGION_LABELS[region] ?? region }),
    );
  searchParams
    .getAll("timeSlots")
    .forEach((slot) =>
      pills.push({ key: "timeSlots", value: slot, label: TIME_SLOT_LABELS[slot] ?? slot }),
    );

  const ageGroup = searchParams.get("ageGroup");
  if (ageGroup && ageGroup !== "any") pills.push({ key: "ageGroup", label: `${ageGroup}+` });

  const openSlots = searchParams.get("openSlots");
  if (openSlots && openSlots !== "any") pills.push({ key: "openSlots", label: `${openSlots}+ open` });

  const platform = searchParams.get("platform");
  if (platform && platform !== "any") {
    pills.push({ key: "platform", label: PLATFORM_LABELS[platform] ?? platform });
  }

  if (searchParams.get("micRequired") === "true") {
    pills.push({ key: "micRequired", label: "Mic required" });
  }

  if (pills.length === 0) return null;

  return (
    <div className="mb-4.5 flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <button
          key={`${pill.key}-${pill.value ?? ""}`}
          type="button"
          onClick={() => removeValue(pill.key, pill.value)}
          className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-xs font-bold text-accent"
        >
          {pill.label}
          <span aria-hidden="true" className="text-sm leading-none">
            ×
          </span>
        </button>
      ))}
      <button type="button" onClick={clearAll} className="font-mono text-xs font-bold text-text-muted underline">
        Clear all
      </button>
    </div>
  );
}
