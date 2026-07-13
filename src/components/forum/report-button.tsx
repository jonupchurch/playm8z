"use client";

import { useState } from "react";
import Link from "next/link";
import { reportForumContent } from "@/lib/actions/report-forum-content";

// FR-009/FR-011: a minimal, no-confirmation report -- there's no
// review/queue UI to navigate to afterward (Notifications + Report's
// eventual job), so a simple "Reported" acknowledgment is the whole
// interaction. An unauthenticated visitor is routed to log in instead.
export function ReportButton({ targetId, isLoggedIn }: { targetId: string; isLoggedIn: boolean }) {
  const [reported, setReported] = useState(false);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="ml-auto rounded-lg px-2 py-1.5 text-xs font-semibold text-text-dim">
        Report
      </Link>
    );
  }

  async function handleClick() {
    setPending(true);
    const result = await reportForumContent({ targetId });
    setPending(false);
    if (result.success) {
      setReported(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || reported}
      className="ml-auto rounded-lg px-2 py-1.5 text-xs font-semibold text-text-dim disabled:opacity-60"
    >
      {reported ? "Reported" : "Report"}
    </button>
  );
}
