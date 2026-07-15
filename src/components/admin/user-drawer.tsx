"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleUserBan } from "@/lib/actions/toggle-user-ban";
import { removeUserContent } from "@/lib/actions/remove-user-content";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import type { UserDetail } from "@/lib/admin/get-user-detail";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

function status(detail: UserDetail): "active" | "flagged" | "banned" {
  if (detail.bannedAt) return "banned";
  if (detail.openReportCount > 0) return "flagged";
  return "active";
}

function statusBadgeClass(s: ReturnType<typeof status>) {
  if (s === "active") return "text-[#8fe0a3] bg-[rgba(78,201,106,0.12)] border-[rgba(78,201,106,0.4)]";
  if (s === "flagged") return "text-[#e6c74e] bg-[rgba(230,199,78,0.12)] border-[rgba(230,199,78,0.4)]";
  return "text-pop-text bg-[rgba(255,59,107,0.13)] border-[rgba(255,59,107,0.42)]";
}

type Tab = "postings" | "forum";

// FR-007/FR-008: a real dialog/panel (native <dialog>, focus trap and
// Escape-to-close for free -- plan.md's Constraints) with the join
// date/region/open-report count, Ban/Unban, and Postings/Forum-posts
// tabs. Which user is open lives in the URL's `userId` param (US1's
// same "state lives in the URL" precedent) -- `detail` is null when
// none is selected or the id didn't resolve to a real user.
export function UserDrawer({ detail }: { detail: UserDetail | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("postings");

  const open = detail !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Resets to the Postings tab fresh each time a different user opens.
  const [openUserId, setOpenUserId] = useState(detail?.id ?? null);
  if (detail && detail.id !== openUserId) {
    setOpenUserId(detail.id);
    setTab("postings");
  }

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("userId");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  async function handleToggleBan() {
    if (!detail) return;
    await toggleUserBan({ userId: detail.id });
    router.refresh();
  }

  async function handleRemove(contentType: "posting" | "forumThread", contentId: string) {
    await removeUserContent({ contentType, contentId });
    router.refresh();
  }

  const currentStatus = detail ? status(detail) : "active";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="user-drawer-heading"
      onClose={close}
      className="hidden h-screen max-h-screen w-110 max-w-[92vw] flex-col overflow-y-auto border-l border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/60"
      style={{ position: "fixed", top: 0, right: 0, margin: 0, left: "auto" }}
    >
      {detail && (
        <>
          <div className="border-b border-border p-5.5">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  style={{ background: avatarGradient(detail.avatarColor) }}
                  className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-on-accent"
                >
                  {detail.handle.trim()[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span id="user-drawer-heading" className="text-lg font-bold text-text">
                      @{detail.handle}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${statusBadgeClass(currentStatus)}`}>
                      {currentStatus === "active" ? "Active" : currentStatus === "flagged" ? "Flagged" : "Banned"}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">{detail.email}</div>
                </div>
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

            <div className="mb-4 flex gap-5.5">
              <div>
                <div className="text-base font-bold text-text">
                  {detail.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                </div>
                <div className="font-mono text-[10px] text-text-dim">joined</div>
              </div>
              <div>
                <div className="text-base font-bold text-text">{detail.region ?? "—"}</div>
                <div className="font-mono text-[10px] text-text-dim">region</div>
              </div>
              <div>
                <div className={`text-base font-bold ${detail.openReportCount > 0 ? "text-pop-text" : "text-text"}`}>
                  {detail.openReportCount}
                </div>
                <div className="font-mono text-[10px] text-text-dim">reports</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleBan}
                className={
                  currentStatus === "banned"
                    ? "flex-1 rounded-xl bg-[linear-gradient(120deg,#8fe0a3,#4ec96a)] px-4 py-2.5 text-sm font-bold text-on-accent"
                    : "flex-1 rounded-xl bg-pop px-4 py-2.5 text-sm font-bold text-on-accent"
                }
              >
                {currentStatus === "banned" ? "Unban user" : "Ban user"}
              </button>
              <a
                href={`/u/${detail.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-center text-sm font-bold text-text"
              >
                View full profile
              </a>
            </div>
          </div>

          <div role="tablist" aria-label="User content" className="flex gap-1 border-b border-border px-5.5 pt-3.5">
            <button
              type="button"
              role="tab"
              id="user-drawer-tab-postings"
              aria-selected={tab === "postings"}
              aria-controls="user-drawer-panel"
              onClick={() => setTab("postings")}
              className={
                tab === "postings"
                  ? "rounded-t-lg border border-b-0 border-border px-3.5 py-2 text-sm font-semibold text-text"
                  : "px-3.5 py-2 text-sm font-semibold text-text-dim"
              }
            >
              Postings
            </button>
            <button
              type="button"
              role="tab"
              id="user-drawer-tab-forum"
              aria-selected={tab === "forum"}
              aria-controls="user-drawer-panel"
              onClick={() => setTab("forum")}
              className={
                tab === "forum"
                  ? "rounded-t-lg border border-b-0 border-border px-3.5 py-2 text-sm font-semibold text-text"
                  : "px-3.5 py-2 text-sm font-semibold text-text-dim"
              }
            >
              Forum posts
            </button>
          </div>

          <div
            id="user-drawer-panel"
            role="tabpanel"
            aria-labelledby={tab === "postings" ? "user-drawer-tab-postings" : "user-drawer-tab-forum"}
            className="flex-1 p-5.5"
          >
            {tab === "postings" &&
              (detail.postings.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {detail.postings.map((posting) => (
                    <div key={posting.id} className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="mb-1 font-mono text-[10px] text-accent-2">{posting.game}</div>
                      <div className="mb-2 text-sm font-semibold text-text">{posting.title}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-text-dim">
                          {posting.seatsOpen}/{posting.seatsTotal} open
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove("posting", posting.id)}
                          className="rounded-lg border border-[rgba(255,59,107,0.35)] px-2.5 py-1 text-xs font-semibold text-pop-text"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-text-dim">No postings.</p>
              ))}

            {tab === "forum" &&
              (detail.forumThreads.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {detail.forumThreads.map((thread) => (
                    <div key={thread.id} className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="mb-1.5 text-sm font-semibold text-text">{thread.title}</div>
                      <p className="mb-2.5 text-xs leading-relaxed text-text-dim">{thread.body}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-text-dim">{thread.replyCount} replies</span>
                        <button
                          type="button"
                          onClick={() => handleRemove("forumThread", thread.id)}
                          className="rounded-lg border border-[rgba(255,59,107,0.35)] px-2.5 py-1 text-xs font-semibold text-pop-text"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-text-dim">No forum posts.</p>
              ))}
          </div>
        </>
      )}
    </dialog>
  );
}
