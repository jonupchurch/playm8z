"use client";

import { useEffect, useState } from "react";

export type HandleAvailability = {
  handle: string;
  available: boolean;
  reason?: string;
};

// Shared by the sign-up form's Username field and the onboarding Step 1
// fallback prompt (research.md #2) -- both check the same endpoint.
export function useHandleAvailability(handle: string, enabled: boolean) {
  const [result, setResult] = useState<HandleAvailability | null>(null);

  useEffect(() => {
    if (!enabled || handle.length === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/auth/check-handle?handle=${encodeURIComponent(handle)}`)
        .then((res) => res.json())
        .then((data) => setResult({ handle, available: data.available, reason: data.reason }))
        .catch(() => setResult(null));
    }, 400);
    return () => clearTimeout(timeout);
  }, [handle, enabled]);

  // Only report a result that actually matches the current inputs -- a
  // stale fetch for a since-changed/cleared handle is treated as "no
  // result yet" rather than requiring a separate effect to reset it.
  return enabled && handle.length > 0 && result?.handle === handle ? result : null;
}
