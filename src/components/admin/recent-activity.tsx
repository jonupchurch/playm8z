import { relativeAge } from "@/components/listings/listing-card";
import type { RecentActivityItem } from "@/lib/admin/get-recent-activity";

const CATEGORY_ICON: Record<string, string> = {
  moderation: "🛡",
  content: "📝",
  access: "🔑",
  system: "⚙",
};

// FR-006/SC-005: an explicit empty state instead of a broken/blank
// section when no AuditEntry rows exist yet (research.md #3 -- this
// feature ships the mechanism, not a live retrofit of other features).
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 text-base font-bold text-text">Recent activity</div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-dim">No activity recorded yet.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 border-b border-border/60 py-2.5 last:border-b-0">
              <span
                aria-hidden="true"
                className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-surface text-xs"
              >
                {CATEGORY_ICON[item.category] ?? "•"}
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-text-muted">
                {item.actorHandle && <b className="text-text">@{item.actorHandle} </b>}
                {item.action}
                {item.targetLabel && <> — {item.targetLabel}</>}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-text-dim">{relativeAge(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
