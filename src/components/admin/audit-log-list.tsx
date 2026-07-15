"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import type { AuditLogActor, AuditLogCategory, AuditLogDayGroup, AuditLogEntry } from "@/lib/admin/get-audit-log";
import type { AuditCategoryFilter, SearchAuditLogInput } from "@/lib/validations/audit-log";

function categoryBadgeClass(category: AuditLogCategory): string {
  if (category === "moderation") return "text-pop-text bg-[rgba(255,59,107,0.14)] border-[rgba(255,59,107,0.4)]";
  if (category === "content") return "text-[#ffd08a] bg-[rgba(255,176,0,0.14)] border-[rgba(255,176,0,0.4)]";
  if (category === "access") return "text-[#8fbfe0] bg-[rgba(53,208,224,0.14)] border-[rgba(53,208,224,0.4)]";
  return "text-text-muted bg-[rgba(180,156,106,0.14)] border-[rgba(180,156,106,0.35)]";
}

function categoryLabel(category: AuditLogCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const CATEGORY_FILTERS: { key: AuditCategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "moderation", label: "Moderation" },
  { key: "content", label: "Content" },
  { key: "access", label: "Access" },
  { key: "system", label: "System" },
];

function EntryRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const detailId = `audit-entry-${entry.id}-detail`;
  const metaRows = entry.meta ? Object.entries(entry.meta) : [];

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <span className="font-semibold text-text">{entry.actorHandle}</span>{" "}
          <span className="text-text-muted">{entry.action}</span>{" "}
          {entry.targetLabel && <span className="font-semibold text-accent-2">{entry.targetLabel}</span>}
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-wide ${categoryBadgeClass(entry.category)}`}>
          {categoryLabel(entry.category)}
        </span>
        <span className="w-14 shrink-0 text-right font-mono text-[10px] text-text-dim">{relativeAge(entry.createdAt)}</span>
        <span className={`shrink-0 font-mono text-xs text-text-dim transition-transform ${expanded ? "rotate-90" : ""}`}>▸</span>
      </button>
      <div id={detailId} hidden={!expanded} className="px-4 pb-4 pl-4">
        <div className="rounded-xl border border-border bg-bg p-3.5">
          {entry.reason && <p className="mb-2 text-[13px] text-text-muted">{entry.reason}</p>}
          {metaRows.length > 0 ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {metaRows.map(([key, value]) => (
                <Fragment key={key}>
                  <span className="font-mono text-[10px] tracking-wide text-text-dim uppercase">{key}</span>
                  <span className="font-mono text-xs text-text">{String(value)}</span>
                </Fragment>
              ))}
            </div>
          ) : (
            !entry.reason && <p className="text-[13px] text-text-dim">No further detail recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// FR-002/FR-003/FR-004/FR-005: search + actor/category filters (URL-
// driven, Browse's/Admin Users' precedent), day-grouped expandable rows
// (a real, keyboard-operable disclosure per plan.md's Constraints), and
// a real CSV-export link mirroring the exact same filter (research.md
// #5) -- no client-side blob juggling, just a real <a> to a gated route
// handler. "Load more" is a real <Link> to the next cumulative page
// (News feed's/013's own precedent), not client-tracked state.
export function AuditLogList({
  groups,
  actors,
  hasMore,
  filters,
}: {
  groups: AuditLogDayGroup[];
  actors: AuditLogActor[];
  hasMore: boolean;
  filters: SearchAuditLogInput;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function replace(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.delete("page");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      replace((params) => {
        if (value.trim()) params.set("q", value);
        else params.delete("q");
      });
    }, 300);
  }

  function setActor(actor: string) {
    replace((params) => {
      if (actor === "all") params.delete("actor");
      else params.set("actor", actor);
    });
  }

  function setCategory(category: AuditCategoryFilter) {
    replace((params) => {
      if (category === "all") params.delete("category");
      else params.set("category", category);
    });
  }

  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.actor !== "all") exportParams.set("actor", filters.actor);
  if (filters.category !== "all") exportParams.set("category", filters.category);
  const exportHref = `/admin/audit-log/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  const nextPageParams = new URLSearchParams(searchParams.toString());
  nextPageParams.set("page", String(filters.page + 1));

  const hasItems = groups.length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-90 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5">
          <label htmlFor="audit-log-search" className="sr-only">
            Search actor, action, target, or reason
          </label>
          <input
            id="audit-log-search"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search actor, action, target, or reason…"
            className="flex-1 bg-transparent py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="audit-log-actor" className="sr-only">
            Filter by actor
          </label>
          <select
            id="audit-log-actor"
            value={filters.actor}
            onChange={(event) => setActor(event.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[11px] text-text outline-none"
          >
            <option value="all">All actors</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                @{actor.handle}
              </option>
            ))}
            <option value="system">System</option>
          </select>
          <a
            href={exportHref}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 font-mono text-[11px] font-bold text-text"
          >
            ⭳ Export CSV
          </a>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setCategory(filter.key)}
            className={
              filters.category === filter.key
                ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                : "rounded-lg border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] font-bold text-text"
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2.5 font-mono text-[10px] tracking-wider text-text-dim uppercase">{group.label}</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
                {group.entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-text-dim">
          No log entries match those filters.
        </div>
      )}

      {hasMore && (
        <div className="mt-5 text-center">
          <Link
            href={`${pathname}?${nextPageParams.toString()}`}
            className="inline-block rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text"
          >
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}
