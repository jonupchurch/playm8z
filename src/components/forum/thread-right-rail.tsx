import Link from "next/link";
import { relativeAge } from "@/components/listings/listing-card";
import { categoryLabel } from "@/lib/forum/categories";
import type { RelatedThread, ThreadDetail } from "@/lib/forum/get-thread";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[13px] text-text-dim">{label}</span>
      <span className="text-[13px] font-semibold text-text">{value}</span>
    </div>
  );
}

// FR-004: accurate thread info and a short related-threads list
// sharing the current thread's category or tags.
export function ThreadRightRail({ thread }: { thread: ThreadDetail }) {
  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
        <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Thread info</div>
        <div className="flex flex-col gap-2.5">
          <InfoRow label="Started by" value={`@${thread.authorHandle}`} />
          <InfoRow label="Replies" value={String(thread.replyCount)} />
          <InfoRow label="Views" value={thread.viewCount.toLocaleString()} />
          <InfoRow label="Created" value={relativeAge(thread.createdAt)} />
        </div>
      </div>

      {thread.relatedThreads.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
          <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Related threads</div>
          <div className="flex flex-col gap-3">
            {thread.relatedThreads.map((related: RelatedThread, index: number) => (
              <div key={related.id}>
                {index > 0 && <div className="mb-3 h-px bg-border" />}
                <Link href={`/forum/thread/${related.id}`} className="block">
                  <div className="mb-0.5 text-[13px] leading-snug font-semibold text-text">{related.title}</div>
                  <div className="font-mono text-[10px] text-text-dim">
                    {categoryLabel(related.categoryId)} · {related.replyCount}{" "}
                    {related.replyCount === 1 ? "reply" : "replies"}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4.5">
        <div className="mb-2 text-sm font-bold text-text">Forum guidelines</div>
        <p className="text-xs leading-relaxed text-text-muted">
          Debate the meta, not the person. No flaming, no boosting ads, no spoilers without tags.
        </p>
      </div>
    </aside>
  );
}
