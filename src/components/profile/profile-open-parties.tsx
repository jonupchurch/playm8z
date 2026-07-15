"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applyToPosting } from "@/lib/actions/apply-to-posting";
import type { PublicProfileOpenPosting } from "@/lib/profile/get-public-profile";

export type ViewerApplicationStatus = "none" | "pending" | "accepted";

// FR-001/plan.md: reuses `006`'s Apply action via a "Request" button --
// no message step here (Listing detail's own listing page already
// offers the full apply-with-message flow; this is a lighter-weight
// entry point). Not offered on your own profile.
export function ProfileOpenParties({
  postings,
  viewerStatuses,
  isLoggedIn,
  isOwnProfile,
}: {
  postings: PublicProfileOpenPosting[];
  viewerStatuses: Record<string, ViewerApplicationStatus>;
  isLoggedIn: boolean;
  isOwnProfile: boolean;
}) {
  const router = useRouter();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleRequest(postingId: string) {
    setSubmittingId(postingId);
    setErrors((current) => ({ ...current, [postingId]: "" }));
    const result = await applyToPosting(postingId, {});
    setSubmittingId(null);
    if (!result.success) {
      setErrors((current) => ({ ...current, [postingId]: result.error }));
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5.5">
      <div className="mb-4 font-mono text-[10px] tracking-[0.16em] text-pop-text uppercase">Open parties</div>
      {postings.length === 0 ? (
        <p className="text-sm text-text-dim">No open parties right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {postings.map((posting) => {
            const status = viewerStatuses[posting.id] ?? "none";
            return (
              <div key={posting.id} className="flex items-center gap-3.5 rounded-[13px] border border-border bg-surface p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 font-mono text-[10px] text-pop-text">{posting.game}</div>
                  <div className="mb-1 truncate text-[15px] font-bold text-text">{posting.title}</div>
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.75 font-mono text-[11px] font-bold text-text-muted">
                    {posting.seatsTotal - posting.seatsOpen}/{posting.seatsTotal} filled
                  </span>
                  {errors[posting.id] && (
                    <p role="alert" className="mt-1.5 text-[11px] text-pop-text">
                      {errors[posting.id]}
                    </p>
                  )}
                </div>
                {!isOwnProfile && (
                  <>
                    {status === "accepted" && (
                      <span className="shrink-0 font-mono text-[11px] font-bold text-[#8fe0a3]">You&apos;re in ✓</span>
                    )}
                    {status === "pending" && (
                      <span className="shrink-0 font-mono text-[11px] font-bold text-text-muted">Requested</span>
                    )}
                    {status === "none" && isLoggedIn && (
                      <button
                        type="button"
                        disabled={submittingId === posting.id}
                        onClick={() => handleRequest(posting.id)}
                        className="shrink-0 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-60"
                      >
                        {submittingId === posting.id ? "…" : "Request"}
                      </button>
                    )}
                    {status === "none" && !isLoggedIn && (
                      <Link
                        href="/login"
                        className="shrink-0 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2.5 text-[13px] font-bold text-on-accent"
                      >
                        Request
                      </Link>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
