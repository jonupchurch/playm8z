"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import { dismissReport } from "@/lib/actions/dismiss-report";
import { resolveReportAction } from "@/lib/actions/resolve-report-action";
import { reasonLabel, severityBadgeClass, severityLabel, type Severity } from "@/lib/moderation/reason-severity";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { ReportsQueueFilter, ReportTargetType } from "@/lib/validations/admin-reports";
import type { ReportsQueueItem, ReportsQueueStats } from "@/lib/admin/get-reports-queue";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

function cardEdgeClass(severity: Severity) {
  if (severity === "high") return "border-[rgba(255,59,107,0.3)]";
  if (severity === "med") return "border-[rgba(230,199,78,0.25)]";
  return "border-border";
}

// Distinct color per target type -- posting reuses Admin Forum's own
// THREAD-badge amber, forum gets cyan, profile gets pink/red, message
// gets tan (matching the wireframe's own per-type palette).
export function targetTypeBadgeClass(type: ReportTargetType): string {
  if (type === "posting") return "text-[#ffd08a] bg-[rgba(255,176,0,0.14)] border-[rgba(255,176,0,0.4)]";
  if (type === "forum") return "text-[#8fbfe0] bg-[rgba(53,208,224,0.14)] border-[rgba(53,208,224,0.4)]";
  if (type === "user") return "text-pop-text bg-[rgba(255,59,107,0.14)] border-[rgba(255,59,107,0.4)]";
  return "text-text-muted bg-[rgba(180,156,106,0.14)] border-[rgba(180,156,106,0.35)]";
}

export function targetTypeLabel(type: ReportTargetType): string {
  if (type === "posting") return "POSTING";
  if (type === "forum") return "FORUM";
  if (type === "user") return "PROFILE";
  return "MESSAGE";
}

export function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

const FILTERS: { key: ReportsQueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "posting", label: "Postings" },
  { key: "forum", label: "Forum" },
  { key: "user", label: "Profiles" },
  { key: "message", label: "Messages" },
];

// FR-002/FR-003/FR-004: stats, URL-driven target-type filter chips, and
// grouped queue cards -- one per reported target (not one per report
// row, research.md #1), each showing a computed severity badge, a
// target-type badge, the canonical reason, a "N reports" count when
// more than one open report exists, the representative reporter's
// note, and the reported content/owner. Remove is never offered for a
// profile (user) target here either (FR-007) -- not just in the
// drawer, since the server action would reject it regardless.
export function ReportsQueue({ stats, rows }: { stats: ReportsQueueStats; rows: ReportsQueueItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentFilter = (searchParams.get("filter") as ReportsQueueFilter | null) ?? "all";

  function setFilter(filter: ReportsQueueFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") params.delete("filter");
    else params.set("filter", filter);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  function openReview(row: ReportsQueueItem) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("targetType", row.targetType);
    params.set("targetId", row.targetId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function dismiss(row: ReportsQueueItem) {
    startTransition(async () => {
      await dismissReport({ targetType: row.targetType, targetId: row.targetId });
      router.refresh();
    });
  }

  function remove(row: ReportsQueueItem) {
    startTransition(async () => {
      await resolveReportAction({ targetType: row.targetType, targetId: row.targetId, resolution: "remove" });
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5.5 grid grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#ffb000]">{stats.openCount}</div>
          <div className="font-mono text-[11px] text-text-dim">open reports</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-pop-text">{stats.highCount}</div>
          <div className="font-mono text-[11px] text-text-dim">high priority</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-[#8fe0a3]">{stats.resolvedTodayCount}</div>
          <div className="font-mono text-[11px] text-text-dim">resolved today</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="text-2xl font-bold text-text">{formatResponseTime(stats.avgResponseMinutes)}</div>
          <div className="font-mono text-[11px] text-text-dim">avg response</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
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
          <div className="mb-1.5 text-lg font-bold text-text">Inbox zero!</div>
          <p className="text-sm text-text-muted">No open reports in this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((row) => (
            <div key={`${row.targetType}:${row.targetId}`} className={`rounded-2xl border bg-surface-2 p-5 ${cardEdgeClass(row.severity)}`}>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold ${severityBadgeClass(row.severity)}`}>
                      {severityLabel(row.severity)}
                    </span>
                    {row.needsBanReview && (
                      <span className="rounded-md border border-[rgba(255,59,107,0.45)] bg-[rgba(255,59,107,0.13)] px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-pop-text">
                        NEEDS BAN REVIEW
                      </span>
                    )}
                    <span className={`rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-wide ${targetTypeBadgeClass(row.targetType)}`}>
                      {targetTypeLabel(row.targetType)}
                    </span>
                    <span className="rounded-full border border-[rgba(180,156,106,0.32)] bg-[rgba(180,156,106,0.12)] px-2.5 py-1 font-mono text-[10px] font-bold text-text-muted">
                      {reasonLabel(row.reason)}
                    </span>
                    {row.reportCount > 1 && (
                      <span className="rounded-md border border-[rgba(255,176,0,0.4)] bg-[rgba(255,176,0,0.12)] px-2 py-1 font-mono text-[10px] font-bold text-[#ffd08a]">
                        {row.reportCount} reports
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-text-dim">{relativeAge(row.createdAt)}</span>
                  </div>

                  <div className="mb-2.5 flex gap-2">
                    <div
                      style={{ background: avatarGradient(row.reporterAvatarColor) }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-on-accent"
                    >
                      {row.reporterHandle.trim()[0]?.toUpperCase() || "P"}
                    </div>
                    <div className="min-w-0 text-[13px] leading-snug">
                      <span className="font-mono text-[10px] text-text-dim">@{row.reporterHandle} reported:</span>{" "}
                      <span className="text-text-muted">&ldquo;{row.note}&rdquo;</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 rounded-[11px] border border-border bg-surface p-3">
                    <div
                      style={{ background: avatarGradient(row.ownerAvatarColor) }}
                      className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-on-accent"
                    >
                      {row.ownerHandle.trim()[0]?.toUpperCase() || "P"}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-0.5 font-mono text-[10px] text-accent-2">
                        @{row.ownerHandle} · {row.context}
                      </div>
                      <p className="text-[13px] leading-relaxed text-text">{row.snippet}</p>
                    </div>
                  </div>
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
                    onClick={() => dismiss(row)}
                    className="rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] font-semibold text-text-muted disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                  {row.targetType !== "user" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(row)}
                      className="rounded-lg bg-pop px-3 py-2 text-[13px] font-bold text-on-accent disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
