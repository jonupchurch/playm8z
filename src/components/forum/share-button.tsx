"use client";

import { useState } from "react";

// Same copy-link pattern as Listing detail's apply-panel.tsx.
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) --
      // the URL is still visible in the address bar, so this is a
      // non-critical convenience action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-muted"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
