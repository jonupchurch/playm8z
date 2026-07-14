"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/actions/mark-all-read";

const TYPE_ICON: Record<string, { icon: string; bg: string }> = {
  join: { icon: "👥", bg: "#ffb000" },
  accepted: { icon: "✓", bg: "#4ec96a" },
  reply: { icon: "💬", bg: "#35d0e0" },
  mention: { icon: "@", bg: "#ff3b6b" },
  message: { icon: "✉️", bg: "#ff6b1a" },
  rating: { icon: "★", bg: "#ffb000" },
  news: { icon: "📰", bg: "#ff6b1a" },
  system: { icon: "🔔", bg: "#ff6b1a" },
};

export type BellPreviewItem = {
  id: string;
  actorLabel: string;
  text: string;
  targetRef: string;
  type: string;
  timeLabel: string;
};

// FR-001: a real disclosure widget (aria-haspopup/aria-expanded,
// click-outside and Escape both dismiss it) -- not a native <dialog>,
// since it's an anchored dropdown rather than a modal overlay.
export function NotificationBell({
  unreadCount,
  preview,
}: {
  unreadCount: number;
  preview: BellPreviewItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleMarkAll() {
    setMarking(true);
    await markAllRead();
    setMarking(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-border bg-surface-2 text-base"
      >
        🔔
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-bg bg-pop px-1 font-mono text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute top-11 right-0 z-30 w-85 max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <span className="text-sm font-bold text-text">Notifications</span>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={marking || unreadCount === 0}
              className="font-mono text-[10px] font-bold text-accent-2 disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {preview.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-text-dim">You&apos;re all caught up.</p>
            )}
            {preview.map((item) => {
              const meta = TYPE_ICON[item.type] ?? TYPE_ICON.system;
              return (
                <Link
                  key={item.id}
                  href={item.targetRef}
                  onClick={() => setOpen(false)}
                  className="flex gap-2.5 border-b border-border/60 px-4 py-3 last:border-b-0 hover:bg-surface"
                >
                  <span
                    aria-hidden="true"
                    style={{ background: meta.bg }}
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg text-xs"
                  >
                    {meta.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-snug text-text-muted">
                      <b className="text-text">{item.actorLabel}</b> {item.text}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim">{item.timeLabel}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border py-2.5 text-center">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-bold text-accent-2">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
