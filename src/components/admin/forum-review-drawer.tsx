"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { relativeAge } from "@/components/listings/listing-card";
import { categoryLabel } from "@/lib/forum/categories";
import { resolveForumReport } from "@/lib/actions/resolve-forum-report";
import { banForumAuthor } from "@/lib/actions/ban-forum-author";
import { AUTO_FLAG_LABELS, type AutoFlagReason } from "@/lib/moderation/auto-flag-rules";
import { reasonLabel, reportReasonSeverity, severityBadgeClass, severityLabel } from "@/lib/moderation/reason-severity";
import { Avatar } from "@/components/ui/avatar";
import type { ForumReview } from "@/lib/admin/get-forum-review";

function typeBadgeClass(type: "forumThread" | "forumReply") {
  return type === "forumThread"
    ? "text-[#ffd08a] bg-[rgba(255,176,0,0.14)] border-[rgba(255,176,0,0.4)]"
    : "text-text-muted bg-surface border-border";
}

function reasonChipClass(reason: string) {
  const sev = reportReasonSeverity(reason);
  if (sev === "high") return "text-pop-text bg-[rgba(255,59,107,0.12)] border-[rgba(255,59,107,0.4)]";
  if (sev === "med") return "text-[#e6c74e] bg-[rgba(230,199,78,0.12)] border-[rgba(230,199,78,0.4)]";
  return "text-text-muted bg-[rgba(180,156,106,0.12)] border-[rgba(180,156,106,0.32)]";
}

// FR-006/FR-007/FR-009/FR-010/FR-011: the drawer -- flagged content in
// context (a reply's immediately-preceding message dimmed above the
// reported content; nothing for a thread), "why it's here," the
// author's card, and Approve/Remove/Lock (threads only)/Warn/Ban. Which
// item is open lives in the URL's `targetType`/`targetId` params (two,
// unlike Admin Postings' single `postingId`, since this queue spans two
// tables) -- `review` is null when none is selected.
export function ForumReviewDrawer({ review }: { review: ForumReview | null }) {
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

  async function handleApprove() {
    if (!review) return;
    await resolveForumReport({ targetType: review.type, targetId: review.id, resolution: "approve" });
    router.refresh();
  }

  async function handleRemove() {
    if (!review) return;
    await resolveForumReport({ targetType: review.type, targetId: review.id, resolution: "remove" });
    router.refresh();
  }

  async function handleLock() {
    if (!review) return;
    await resolveForumReport({ targetType: review.type, targetId: review.id, resolution: "lock" });
    router.refresh();
  }

  async function handleWarn() {
    if (!review) return;
    await resolveForumReport({ targetType: review.type, targetId: review.id, resolution: "warn" });
    router.refresh();
  }

  async function handleBan() {
    if (!review) return;
    await banForumAuthor({ targetType: review.type, targetId: review.id });
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="forum-review-heading"
      onClose={close}
      className="hidden h-screen max-h-screen w-115 max-w-[94vw] flex-col overflow-y-auto border-l border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/60"
      style={{ position: "fixed", top: 0, right: 0, margin: 0, left: "auto" }}
    >
      {review && (
        <>
          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold ${severityBadgeClass(review.severity)}`}>
                  {severityLabel(review.severity)}
                </span>
                <span className={`rounded-md border px-2 py-1 font-mono text-[9px] font-bold tracking-wide ${typeBadgeClass(review.type)}`}>
                  {review.type === "forumThread" ? "THREAD" : "REPLY"}
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
            <div className="mb-1.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
              {categoryLabel(review.categoryId)} · {relativeAge(review.createdAt)}
            </div>
            <h2 id="forum-review-heading" className="font-mono text-[11px] text-text-dim">
              {review.type === "forumThread" ? "Thread" : `Reply in "${review.threadTitle}"`}
            </h2>
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Flagged content</div>
            {review.precedingContext && (
              <div className="mb-2.5 flex gap-2.5 opacity-55">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface font-mono text-[11px] text-text-dim">
                  {review.precedingContext.authorHandle.trim()[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <div className="mb-0.5 font-mono text-[10px] text-text-dim">@{review.precedingContext.authorHandle}</div>
                  <p className="text-[13px] leading-normal text-text-muted">{review.precedingContext.content}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2.5 rounded-[11px] border border-[rgba(255,59,107,0.3)] bg-[rgba(255,59,107,0.06)] p-3">
              <Avatar
                avatarImage={review.authorAvatarImage}
                googleImage={review.authorImage}
                avatarColor={review.authorAvatarColor}
                handle={review.authorHandle}
                className="h-7.5 w-7.5 shrink-0 rounded-lg text-xs"
              />
              <div>
                <div className="mb-0.5 font-mono text-[10px] text-accent-2">@{review.authorHandle} · reported</div>
                <p className="text-sm leading-relaxed text-text">{review.content}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Why it&apos;s here</div>
            {review.autoFlagReason && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-[rgba(230,199,78,0.3)] bg-[rgba(230,199,78,0.08)] px-3 py-2.5">
                <span className="font-mono text-[10px] font-bold text-[#e6c74e]">AUTO-FLAG</span>
                <span className="text-[13px] text-text-muted">{AUTO_FLAG_LABELS[review.autoFlagReason as AutoFlagReason]}</span>
              </div>
            )}
            {review.reports.length > 0 ? (
              <div className="flex flex-col gap-2">
                {review.reports.map((report, index) => (
                  <div
                    key={`${report.reason}-${index}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${reasonChipClass(report.reason)}`}>
                      {reasonLabel(report.reason)}
                    </span>
                    <span className="font-mono text-[11px] text-text-muted">reported by @{report.reporterHandle}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-dim">No user reports — surfaced by the automated filter only.</p>
            )}
          </div>

          <div className="border-b border-border p-5.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Author</div>
            <div className="mb-3.5 flex items-center gap-3">
              <Avatar
                avatarImage={review.authorAvatarImage}
                googleImage={review.authorImage}
                avatarColor={review.authorAvatarColor}
                handle={review.authorHandle}
                className="h-11 w-11 rounded-xl text-base"
              />
              <div>
                <div className="text-sm font-bold text-text">@{review.authorHandle}</div>
                <div className="font-mono text-[11px] text-text-muted">
                  joined {review.authorJoinedAt.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
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
                <div className="text-base font-bold text-text">{review.forumPosts}</div>
                <div className="font-mono text-[10px] text-text-dim">forum posts</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-5.5">
            <button
              type="button"
              onClick={handleApprove}
              className="w-full rounded-xl border border-[rgba(78,201,106,0.45)] bg-[rgba(78,201,106,0.12)] px-4 py-3 text-sm font-bold text-[#8fe0a3]"
            >
              Approve &amp; clear reports
            </button>
            <button type="button" onClick={handleRemove} className="w-full rounded-xl bg-pop px-4 py-3 text-sm font-bold text-on-accent">
              Remove {review.type === "forumThread" ? "thread" : "reply"}
            </button>
            {review.type === "forumThread" && (
              <button
                type="button"
                onClick={handleLock}
                className="w-full rounded-xl border border-[rgba(53,208,224,0.4)] px-3.5 py-2.5 text-[13px] font-semibold text-[#8fbfe0]"
              >
                🔒 Lock thread
              </button>
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleWarn}
                className="flex-1 rounded-xl border border-[rgba(230,199,78,0.4)] px-3.5 py-2.5 text-[13px] font-semibold text-[#e6c74e]"
              >
                Warn author
              </button>
              <button
                type="button"
                onClick={handleBan}
                className="flex-1 rounded-xl border border-[rgba(255,59,107,0.4)] px-3.5 py-2.5 text-[13px] font-semibold text-pop-text"
              >
                Ban author
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
