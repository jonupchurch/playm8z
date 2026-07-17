"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import { dismissReport } from "@/lib/actions/dismiss-report";
import { resolveReportAction } from "@/lib/actions/resolve-report-action";
import { banReportedUser } from "@/lib/actions/ban-reported-user";
import { reasonLabel, severityBadgeClass, severityLabel } from "@/lib/moderation/reason-severity";
import { Avatar } from "@/components/ui/avatar";
import { targetTypeBadgeClass, targetTypeLabel } from "@/components/admin/reports-queue";
import type { ReportReview } from "@/lib/admin/get-report-review";

// FR-005/FR-006/FR-007/FR-008/FR-009: the drawer -- the representative
// reporter's note (+ "+N others reported this" when applicable), the
// reported content in context, a cross-link to that content's own
// dedicated moderation queue where one exists, the reported user's
// card (join info, prior warnings, all-time cross-source total
// reports), and Dismiss/Remove (never for a profile target)/Warn/Ban.
// Which item is open lives in the URL's `targetType`/`targetId` params
// (Admin Forum's own two-param drawer convention) -- `review` is null
// when none is selected.
export function ReportReviewDrawer({ review }: { review: ReportReview | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = review !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("targetType");
    params.delete("targetId");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  async function handleDismiss() {
    if (!review) return;
    await dismissReport({ targetType: review.targetType, targetId: review.targetId });
    router.refresh();
  }

  async function handleRemove() {
    if (!review) return;
    await resolveReportAction({ targetType: review.targetType, targetId: review.targetId, resolution: "remove" });
    router.refresh();
  }

  async function handleWarn() {
    if (!review) return;
    await resolveReportAction({ targetType: review.targetType, targetId: review.targetId, resolution: "warn" });
    router.refresh();
  }

  async function handleBan() {
    if (!review) return;
    await banReportedUser({ targetType: review.targetType, targetId: review.targetId });
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-review-heading"
      onClose={close}
      className="hidden h-screen max-h-screen w-115 max-w-[94vw] flex-col overflow-y-auto border-l border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/60"
      style={{ position: "fixed", top: 0, right: 0, margin: 0, left: "auto" }}
    >
      {review && (
        <>
          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold ${severityBadgeClass(review.severity)}`}>
                  {severityLabel(review.severity)}
                </span>
                <span className={`rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-wide ${targetTypeBadgeClass(review.targetType)}`}>
                  {targetTypeLabel(review.targetType)}
                </span>
                <span className="rounded-full border border-[rgba(180,156,106,0.32)] bg-[rgba(180,156,106,0.12)] px-2.5 py-1 font-mono text-[10px] font-bold text-text-muted">
                  {reasonLabel(review.reason)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim"
              >
                ✕
              </button>
            </div>
            <h2 id="report-review-heading" className="font-mono text-[11px] text-text-dim">
              Reported {relativeAge(review.createdAt)} · {review.context}
            </h2>
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
              {review.reportCount > 1 ? "Top reporter" : "Reporter"}
            </div>
            <div className="flex gap-2.5 rounded-[11px] border border-border bg-surface p-3">
              <Avatar
                avatarImage={review.reporterAvatarImage}
                googleImage={review.reporterImage}
                avatarColor={review.reporterAvatarColor}
                handle={review.reporterHandle}
                className="h-7.5 w-7.5 shrink-0 rounded-lg text-xs"
              />
              <div>
                <div className="mb-0.5 text-[13px] font-semibold text-text">@{review.reporterHandle}</div>
                <p className="text-[13px] leading-relaxed text-text-muted">&ldquo;{review.note}&rdquo;</p>
              </div>
            </div>
            {review.othersCount > 0 && (
              <div className="mt-2.5 font-mono text-[11px] text-text-muted">
                + {review.othersCount} other{review.othersCount > 1 ? "s" : ""} reported this
              </div>
            )}
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Reported content</div>
            <div className="flex gap-2.5 rounded-[11px] border border-[rgba(255,59,107,0.3)] bg-[rgba(255,59,107,0.06)] p-3">
              <Avatar
                avatarImage={review.ownerAvatarImage}
                googleImage={review.ownerImage}
                avatarColor={review.ownerAvatarColor}
                handle={review.ownerHandle}
                className="h-7.5 w-7.5 shrink-0 rounded-lg text-xs"
              />
              <div>
                <div className="mb-0.5 font-mono text-[10px] text-accent-2">
                  @{review.ownerHandle} · {review.context}
                </div>
                <p className="text-sm leading-relaxed text-text">{review.snippet}</p>
              </div>
            </div>
            {review.crossLinkHref && (
              <a href={review.crossLinkHref} className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                Open in {review.crossLinkLabel} moderation →
              </a>
            )}
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Reported user</div>
            <div className="mb-3.5 flex items-center gap-3">
              <Avatar
                avatarImage={review.ownerAvatarImage}
                googleImage={review.ownerImage}
                avatarColor={review.ownerAvatarColor}
                handle={review.ownerHandle}
                className="h-11 w-11 rounded-xl text-base"
              />
              <div>
                <div className="text-sm font-bold text-text">@{review.ownerHandle}</div>
                <div className="font-mono text-[11px] text-text-muted">
                  joined {review.ownerJoinedAt.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            <div className="flex gap-5">
              <div>
                <div className={`text-base font-bold ${review.priorWarnings > 0 ? "text-[#e6c74e]" : "text-text"}`}>
                  {review.priorWarnings}
                </div>
                <div className="font-mono text-[10px] text-text-dim">prior warnings</div>
              </div>
              <div>
                <div className={`text-base font-bold ${review.totalReports >= 5 ? "text-pop-text" : "text-text"}`}>{review.totalReports}</div>
                <div className="font-mono text-[10px] text-text-dim">total reports</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-5.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-text-muted"
            >
              Dismiss — no violation
            </button>
            {review.targetType !== "user" && (
              <button type="button" onClick={handleRemove} className="w-full rounded-xl bg-pop px-4 py-3 text-sm font-bold text-on-accent">
                Remove content
              </button>
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleWarn}
                className="flex-1 rounded-xl border border-[rgba(230,199,78,0.4)] px-3.5 py-2.5 text-[13px] font-semibold text-[#e6c74e]"
              >
                Warn user
              </button>
              <button
                type="button"
                onClick={handleBan}
                className="flex-1 rounded-xl border border-[rgba(255,59,107,0.4)] px-3.5 py-2.5 text-[13px] font-semibold text-pop-text"
              >
                Ban user
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
