import Link from "next/link";
import type { NeedsAttention as NeedsAttentionCounts } from "@/lib/admin/get-needs-attention";

// FR-005: each card links toward its corresponding (not-yet-built)
// admin queue page -- spec.md's explicit "define the real destination
// now" call, same pattern as logAuditEntry()'s no-callers-yet design.
const QUEUES: { key: keyof NeedsAttentionCounts; label: string; sub: string; accent: string; href: string }[] = [
  { key: "userReports", label: "User reports", sub: "phishing, harassment, safety", accent: "text-pop-text", href: "/admin/reports" },
  { key: "postingReview", label: "Posting review", sub: "spam & flagged postings", accent: "text-[#ffb000]", href: "/admin/postings" },
  { key: "forumReview", label: "Forum review", sub: "reported threads & replies", accent: "text-[#35d0e0]", href: "/admin/forum" },
];

export function NeedsAttention({ counts }: { counts: NeedsAttentionCounts }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 text-base font-bold text-text">Needs attention</div>
      <div className="flex flex-col gap-2.5">
        {QUEUES.map((queue) => (
          <Link
            key={queue.key}
            href={queue.href}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
          >
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{queue.label}</div>
              <div className="font-mono text-[10px] text-text-dim">{queue.sub}</div>
            </div>
            <span className={`text-xl font-bold ${queue.accent}`}>{counts[queue.key]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
