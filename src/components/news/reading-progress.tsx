"use client";

import { useEffect, useState } from "react";

// FR-004: a pure client-side scroll-position indicator, no server
// state. Decorative -- `aria-hidden`, never a substitute for real
// navigation landmarks (plan.md's own accessibility constraint).
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const el = document.scrollingElement || document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0;
      setProgress(pct);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div aria-hidden="true" className="fixed top-0 right-0 left-0 z-30 h-0.75 bg-transparent">
      <div
        id="reading-progress-bar"
        className="h-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-pop))] transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
