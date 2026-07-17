"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleUserBan } from "@/lib/actions/toggle-user-ban";
import { Avatar } from "@/components/ui/avatar";
import type { AdminUserRow, AdminUsersStats } from "@/lib/admin/search-admin-users";

function statusBadgeClass(status: AdminUserRow["status"]) {
  if (status === "active") {
    return "text-[#8fe0a3] bg-[rgba(78,201,106,0.12)] border-[rgba(78,201,106,0.4)]";
  }
  if (status === "flagged") {
    return "text-[#e6c74e] bg-[rgba(230,199,78,0.12)] border-[rgba(230,199,78,0.4)]";
  }
  return "text-pop-text bg-[rgba(255,59,107,0.13)] border-[rgba(255,59,107,0.42)]";
}

function statusLabel(status: AdminUserRow["status"]) {
  if (status === "active") return "Active";
  if (status === "flagged") return "Flagged";
  return "Banned";
}

const STATUS_FILTERS: { key: "all" | "active" | "flagged" | "banned"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "flagged", label: "Flagged" },
  { key: "banned", label: "Banned" },
];

// FR-002/FR-003/FR-005/FR-010: stats, a debounced search + status
// filter (state lives in the URL, Browse's/Forum index's precedent),
// and row actions. Ban is the single severe account action this
// feature offers (no separate Delete, ADR 0005/research.md #1) --
// clicking it swaps in an inline "Ban this user? Yes/No" confirm
// (plan.md's Constraints: real focus management, not just a visual
// swap) rather than acting immediately; Unban is immediate.
export function UserTable({ stats, rows }: { stats: AdminUsersStats; rows: AdminUserRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmingBanId, setConfirmingBanId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const banButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (confirmingBanId) yesButtonRef.current?.focus();
  }, [confirmingBanId]);

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

  function setStatus(status: string) {
    replace((params) => {
      if (status === "all") params.delete("status");
      else params.set("status", status);
    });
  }

  function openDrawer(userId: string) {
    replace((params) => params.set("userId", userId));
  }

  function cancelBan(userId: string) {
    setConfirmingBanId(null);
    banButtonRefs.current.get(userId)?.focus();
  }

  function confirmBan(userId: string) {
    setConfirmingBanId(null);
    startTransition(async () => {
      await toggleUserBan({ userId });
      router.refresh();
    });
  }

  function unban(userId: string) {
    startTransition(async () => {
      await toggleUserBan({ userId });
      router.refresh();
    });
  }

  const currentStatus = searchParams.get("status") ?? "all";

  return (
    <div>
      <div className="mb-5.5 grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-text">{stats.total}</div>
          <div className="font-mono text-[11px] text-text-dim">total users</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#4ec96a]">{stats.active}</div>
          <div className="font-mono text-[11px] text-text-dim">active</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#ffb000]">{stats.flagged}</div>
          <div className="font-mono text-[11px] text-text-dim">flagged</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-pop-text">{stats.banned}</div>
          <div className="font-mono text-[11px] text-text-dim">banned</div>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-90 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5">
          <label htmlFor="admin-users-search" className="sr-only">
            Search name, handle, or email
          </label>
          <input
            id="admin-users-search"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, handle, or email…"
            className="flex-1 bg-transparent py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatus(filter.key)}
              className={
                currentStatus === filter.key
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
        <div className="grid grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1fr_2fr] gap-3 border-b border-border bg-surface px-4.5 py-3 font-mono text-[10px] tracking-wider text-text-dim uppercase">
          <div>User</div>
          <div>Email</div>
          <div>Region</div>
          <div>Content</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[2.2fr_1.6fr_1fr_1.1fr_1fr_2fr] items-center gap-3 border-b border-border/60 px-4.5 py-3.5 last:border-b-0"
          >
            <button type="button" onClick={() => openDrawer(row.id)} className="flex min-w-0 items-center gap-2.5 text-left">
              <Avatar
                avatarImage={row.avatarImage}
                googleImage={row.image}
                avatarColor={row.avatarColor}
                handle={row.handle}
                className="h-9 w-9 shrink-0 rounded-[11px] text-sm"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-text">@{row.handle}</div>
                <div className="font-mono text-[10px] text-text-dim">
                  {row.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                </div>
              </div>
            </button>
            <div className="truncate font-mono text-xs text-text-muted">{row.email}</div>
            <div className="font-mono text-xs text-text-muted">{row.region ?? "—"}</div>
            <div className="font-mono text-[11px] text-text-dim">
              {row.postingCount} posts · {row.forumThreadCount} threads
            </div>
            <div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${statusBadgeClass(row.status)}`}>
                {statusLabel(row.status)}
              </span>
            </div>
            <div className="flex justify-end">
              {confirmingBanId === row.id ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-pop-text">Ban this user?</span>
                  <button
                    ref={yesButtonRef}
                    type="button"
                    onClick={() => confirmBan(row.id)}
                    className="rounded-lg bg-pop px-3 py-1.5 text-xs font-bold text-on-accent"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelBan(row.id)}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openDrawer(row.id)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-muted"
                  >
                    View
                  </button>
                  {row.status === "banned" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => unban(row.id)}
                      className="rounded-lg border border-[rgba(78,201,106,0.4)] bg-[rgba(78,201,106,0.12)] px-2.5 py-1.5 text-xs font-semibold text-[#8fe0a3] disabled:opacity-60"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      ref={(el) => {
                        if (el) banButtonRefs.current.set(row.id, el);
                      }}
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirmingBanId(row.id)}
                      className="rounded-lg border border-[rgba(255,59,107,0.4)] bg-[rgba(255,59,107,0.1)] px-2.5 py-1.5 text-xs font-semibold text-pop-text disabled:opacity-60"
                    >
                      Ban
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {rows.length === 0 && <div className="py-12 text-center text-sm text-text-dim">No users match your search.</div>}
      </div>
    </div>
  );
}
