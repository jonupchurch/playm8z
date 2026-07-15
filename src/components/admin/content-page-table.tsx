"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { togglePageStatus } from "@/lib/actions/toggle-page-status";
import { createContentPage } from "@/lib/actions/create-content-page";
import { deleteContentPage } from "@/lib/actions/delete-content-page";
import type { ContentPageFilter } from "@/lib/validations/admin-content-pages";
import type { AdminContentPageRow, ContentPagesStats } from "@/lib/admin/search-content-pages";

const FILTERS: { key: ContentPageFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "system", label: "System" },
];

// Cosmetic only -- `slug` itself is bare (no leading slash, matching
// `014`'s real routing convention, see seed-system-pages.ts's own
// note); this just picks a recognizable icon for the three seeded
// system pages, falling back to a generic page icon for every custom
// page (there's no stored icon field to key off of instead).
function pageIcon(slug: string): string {
  if (slug === "about") return "ℹ️";
  if (slug === "privacy") return "🛡️";
  if (slug === "terms") return "📜";
  return "📄";
}

function statusBadgeClass(status: "published" | "draft"): string {
  return status === "published"
    ? "text-[#8fe0a3] bg-[rgba(78,201,106,0.12)] border-[rgba(78,201,106,0.4)]"
    : "text-text-muted bg-[rgba(180,156,106,0.12)] border-[rgba(180,156,106,0.32)]";
}

// FR-002/FR-003/FR-004/FR-006/FR-007/FR-008: stats, a debounced search
// + status/system filter (state lives in the URL, Admin Users'/Admin
// News' own precedent), and row actions. Publish/Unpublish call `014`'s
// existing togglePageStatus directly (research.md #1, no second
// implementation); View/Edit navigate to the page's own public slug,
// where `014`'s inline-edit affordance already lives. Delete swaps in
// an inline "Delete? Yes/No" confirm with real focus management
// (Admin Users' own established pattern), hidden entirely for system
// rows (a 🔒 indicator takes its place instead).
export function ContentPageTable({ stats, rows }: { stats: ContentPagesStats; rows: AdminContentPageRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (confirmingDeleteId) yesButtonRef.current?.focus();
  }, [confirmingDeleteId]);

  function replace(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
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

  function setFilter(filter: ContentPageFilter) {
    replace((params) => {
      if (filter === "all") params.delete("filter");
      else params.set("filter", filter);
    });
  }

  function togglePublish(row: AdminContentPageRow) {
    startTransition(async () => {
      await togglePageStatus({ slug: row.slug, status: row.status === "published" ? "draft" : "published" });
      router.refresh();
    });
  }

  function cancelDelete(pageId: string) {
    setConfirmingDeleteId(null);
    deleteButtonRefs.current.get(pageId)?.focus();
  }

  function confirmDelete(pageId: string) {
    setConfirmingDeleteId(null);
    startTransition(async () => {
      await deleteContentPage({ pageId });
      router.refresh();
    });
  }

  function newPage() {
    startTransition(async () => {
      await createContentPage();
      router.refresh();
    });
  }

  const currentFilter = (searchParams.get("filter") as ContentPageFilter | null) ?? "all";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Content pages</h1>
          <p className="text-sm text-text-muted">
            Manage static pages — legal, marketing &amp; help. System pages can be edited but not deleted.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={newPage}
          className="flex items-center gap-1.5 rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          <span className="text-base leading-none">＋</span> New page
        </button>
      </div>

      <div className="mb-5.5 grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-text">{stats.total}</div>
          <div className="font-mono text-[11px] text-text-dim">total pages</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#4ec96a]">{stats.published}</div>
          <div className="font-mono text-[11px] text-text-dim">published</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-text-muted">{stats.draft}</div>
          <div className="font-mono text-[11px] text-text-dim">drafts</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#8fbfe0]">{stats.system}</div>
          <div className="font-mono text-[11px] text-text-dim">system pages</div>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-90 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5">
          <label htmlFor="admin-content-pages-search" className="sr-only">
            Search pages or URLs
          </label>
          <input
            id="admin-content-pages-search"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search pages or URLs…"
            className="flex-1 bg-transparent py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilter(filter.key)}
              className={
                currentFilter === filter.key
                  ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                  : "rounded-lg border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] font-bold text-text"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="grid grid-cols-[2.8fr_1.4fr_0.9fr_0.9fr_1.7fr] gap-3 border-b border-border bg-surface px-4.5 py-3 font-mono text-[10px] tracking-wider text-text-dim uppercase">
          <div>Page</div>
          <div>URL</div>
          <div>Status</div>
          <div>Updated</div>
          <div className="text-right">Actions</div>
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[2.8fr_1.4fr_0.9fr_0.9fr_1.7fr] items-center gap-3 border-b border-border/60 px-4.5 py-3.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[9px] bg-surface text-sm">{pageIcon(row.slug)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-text">{row.title}</span>
                  {row.system && (
                    <span className="shrink-0 rounded-md border border-[rgba(53,208,224,0.35)] bg-[rgba(53,208,224,0.1)] px-1.5 py-0.5 font-mono text-[9px] font-bold whitespace-nowrap text-[#8fbfe0]">
                      🔒 System
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="truncate font-mono text-xs text-pop-text">/{row.slug}</div>
            <div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${statusBadgeClass(row.status)}`}>
                {row.status === "published" ? "Published" : "Draft"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-text-dim">
              {row.updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="flex justify-end">
              {confirmingDeleteId === row.id ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-pop-text">Delete?</span>
                  <button
                    ref={yesButtonRef}
                    type="button"
                    onClick={() => confirmDelete(row.id)}
                    className="rounded-lg bg-pop px-3 py-1.5 text-xs font-bold text-on-accent"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelDelete(row.id)}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => togglePublish(row)}
                    className={
                      row.status === "published"
                        ? "rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-semibold text-text-muted disabled:opacity-60"
                        : "rounded-lg border border-[rgba(78,201,106,0.4)] bg-[rgba(78,201,106,0.1)] px-2.5 py-1.5 text-xs font-semibold text-[#8fe0a3] disabled:opacity-60"
                    }
                  >
                    {row.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <a href={`/pages/${row.slug}`} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-muted">
                    View
                  </a>
                  <a
                    href={`/pages/${row.slug}`}
                    className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-2.5 py-1.5 text-xs font-bold text-on-accent"
                  >
                    Edit
                  </a>
                  {row.system ? (
                    <span className="flex h-7.5 w-7.5 items-center justify-center text-sm text-text-dim" title="System page">
                      🔒
                    </span>
                  ) : (
                    <button
                      ref={(el) => {
                        if (el) deleteButtonRefs.current.set(row.id, el);
                      }}
                      type="button"
                      title="Delete"
                      onClick={() => setConfirmingDeleteId(row.id)}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-border text-sm text-text-dim"
                    >
                      🗑
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {rows.length === 0 && <div className="py-12 text-center text-sm text-text-dim">No pages match your search.</div>}
      </div>
    </div>
  );
}
