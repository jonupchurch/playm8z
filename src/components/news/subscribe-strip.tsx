"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/actions/subscribe-newsletter";

// FR-006/plan.md: requires no login (this project's first write action
// with no auth check at all). Shows a clear success vs. already-
// subscribed confirmation state rather than a silent no-op on a
// duplicate email (plan.md's own accessibility constraint).
export function SubscribeStrip() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "subscribed" | "already">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await subscribeNewsletter({ email });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus(result.alreadySubscribed ? "already" : "subscribed");
    setEmail("");
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-5 rounded-2xl border border-accent-2/30 bg-[linear-gradient(120deg,rgba(255,176,0,0.09),rgba(255,59,107,0.06))] p-6.5">
      <div className="min-w-55 flex-1">
        <div className="mb-1 text-lg font-bold text-text">Never miss an update</div>
        <p className="text-[13px] text-text-muted">Get playm8z news, events and patch notes in your inbox.</p>
      </div>

      {status === "idle" ? (
        <form onSubmit={handleSubmit} noValidate className="flex min-w-65 flex-1 gap-2">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            {submitting ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      ) : (
        <p role="status" className="min-w-65 flex-1 text-sm font-bold text-success">
          {status === "already" ? "You're already subscribed!" : "Subscribed! Watch your inbox."}
        </p>
      )}

      {error && (
        <p role="alert" className="w-full text-sm text-pop-text">
          {error}
        </p>
      )}
    </div>
  );
}
