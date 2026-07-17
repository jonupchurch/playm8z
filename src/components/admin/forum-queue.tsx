"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import { categoryLabel } from "@/lib/forum/categories";
import { resolveForumReport } from "@/lib/actions/resolve-forum-report";
import { AUTO_FLAG_LABELS, type AutoFlagReason } from "@/lib/moderation/auto-flag-rules";
import { reasonLabel, reportReasonSeverity, severityBadgeClass, severityLabel, type Severity } from "@/lib/moderation/reason-severity";
import { Avatar } from "@/components/ui/avatar";
import type { ForumQueueFilter } from "@/lib/validations/admin-forum";
import type { ForumQueueItem, ForumQueueStats } from "@/lib/admin/get-forum-queue";

function cardEdgeClass(severity: Severity) {
  if (severity === "high") return "border-[rgba(255,59,107,0.3)]";
  if (severity === "med") return "border-[rgba(230,199,78,0.25)]";
  return "border-border";
}

function typeBadgeClass(type: "forumThread" | "forumReply") {
  return type === "forumThread"
    ? "text-[#ffd08a] bg-[rgba(255,176,0,0.14)] border-[rgba(255,176,0,0.4)]"
    : "text-text-muted bg-surface border-border";
}

// Distinct from severityBadgeClass's own "low" color -- the wireframe's
// per-reason reason chips use a muted tan for low severity, not the
// cyan its severity BADGE uses at the same tier.
function reasonChipClass(reason: string) {
  const sev = reportReasonSeverity(reason);
  if (sev === "high") return "text-pop-text bg-[rgba(255,59,107,0.12)] border-[rgba(255,59,107,0.4)]";
  if (sev === "med") return "text-[#e6c74e] bg-[rgba(230,199,78,0.12)] border-[rgba(230,199,78,0.4)]";
  return "text-text-muted bg-[rgba(180,156,106,0.12)] border-[rgba(180,156,106,0.32)]";
}

const FILTERS: { key: ForumQueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "threads", label: "Threads" },
  { key: "replies", label: "Replies" },
  { key: "flagged", label: "Auto-flagged" },
];

// FR-002/FR-003/FR-004/FR-005: stats (incl. audit-log-derived "actioned
// today"), URL-driven filter chips, and queue cards spanning threads
// and replies with a computed severity badge, a THREAD/REPLY type
// badge, canonical reason chips, and an AUTO-FLAG banner. Review opens
// the drawer via `?targetType=&targetId=` (two params, unlike Admin
// Postings' single `postingId`, since this queue spans two tables).
export function ForumQueue({ stats, rows }: { stats: ForumQueueStats; rows: ForumQueueItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentFilter = (searchParams.get("filter") as ForumQueueFilter | null) ?? "all";

  function setFilter(filter: ForumQueueFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") params.delete("filter");
    else params.set("filter", filter);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  function openReview(item: ForumQueueItem) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("targetType", item.type);
    params.set("targetId", item.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  function resolve(item: ForumQueueItem, resolution: "approve" | "remove") {
    startTransition(async () => {
      await resolveForumReport({ targetType: item.type, targetId: item.id, resolution });
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5.5 grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#ffb000]">{stats.inQueue}</div>
          <div className="font-mono text-[11px] text-text-dim">in queue</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-pop-text">{stats.reportedCount}</div>
          <div className="font-mono text-[11px] text-text-dim">user-reported</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#e6c74e]">{stats.flaggedCount}</div>
          <div className="font-mono text-[11px] text-text-dim">auto-flagged</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#8fe0a3]">{stats.actionedToday}</div>
          <div className="font-mono text-[11px] text-text-dim">actioned today</div>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
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

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-18 text-center">
          <div className="mx-auto mb-3.5 flex h-13 w-13 items-center justify-center rounded-full border border-[rgba(78,201,106,0.5)] bg-[rgba(78,201,106,0.14)] text-2xl font-bold text-[#4ec96a]">
            ✓
          </div>
          <div className="mb-1.5 text-lg font-bold text-text">Queue clear!</div>
          <p className="text-sm text-text-muted">Nothing to review in this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((row) => (
            <div key={row.id} className={`rounded-2xl border bg-surface-2 p-5 ${cardEdgeClass(row.severity)}`}>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold ${severityBadgeClass(row.severity)}`}>
                      {severityLabel(row.severity)}
                    </span>
                    {row.needsBanReview && (
                      <span className="rounded-md border border-[rgba(255,59,107,0.45)] bg-[rgba(255,59,107,0.13)] px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-pop-text">
                        NEEDS BAN REVIEW
                      </span>
                    )}
                    <span className={`rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-wide ${typeBadgeClass(row.type)}`}>
                      {row.type === "forumThread" ? "THREAD" : "REPLY"}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-accent-2 uppercase">{categoryLabel(row.categoryId)}</span>
                    <span className="font-mono text-[10px] text-text-dim">· {relativeAge(row.createdAt)}</span>
                  </div>
                  <div className="mb-1.5 font-mono text-[11px] text-text-dim">
                    {row.type === "forumThread" ? "Thread" : `Reply in "${row.threadTitle}"`}
                  </div>
                  <p className="mb-3 text-[13px] leading-relaxed text-text-muted">{row.content}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        avatarImage={row.authorAvatarImage}
                        googleImage={row.authorImage}
                        avatarColor={row.authorAvatarColor}
                        handle={row.authorHandle}
                        className="h-6 w-6 rounded-md text-[11px]"
                      />
                      <span className="font-mono text-[11px] text-text-muted">@{row.authorHandle}</span>
                    </div>
                    {row.reports.length > 0 && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
                    {row.reports.map((report, index) => (
                      <span
                        key={`${report.reason}-${index}`}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${reasonChipClass(report.reason)}`}
                      >
                        {reasonLabel(report.reason)}
                      </span>
                    ))}
                  </div>
                  {row.autoFlagReason && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-[rgba(230,199,78,0.3)] bg-[rgba(230,199,78,0.08)] px-3 py-2">
                      <span className="font-mono text-[10px] font-bold text-[#e6c74e]">AUTO-FLAG</span>
                      <span className="text-xs text-text-muted">{AUTO_FLAG_LABELS[row.autoFlagReason as AutoFlagReason]}</span>
                    </div>
                  )}
                </div>
                <div className="flex w-32.5 shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openReview(row)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-text"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resolve(row, "approve")}
                    className="rounded-lg border border-[rgba(78,201,106,0.4)] bg-[rgba(78,201,106,0.12)] px-3 py-2 text-[13px] font-bold text-[#8fe0a3] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resolve(row, "remove")}
                    className="rounded-lg bg-pop px-3 py-2 text-[13px] font-bold text-on-accent disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
