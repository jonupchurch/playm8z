"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { completePasswordReset } from "@/lib/actions/complete-password-reset";

const fieldClass =
  "w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent-2";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  // Distinct from `error`: a dead link means there is nothing to retry
  // here, so the form itself goes away and we send them back to request a
  // fresh one. A password typo just re-renders the form.
  const [linkDead, setLinkDead] = useState(!token);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await completePasswordReset({ token, password });

    setPending(false);
    if (result.success) {
      setDone(true);
      return;
    }
    if (result.invalidToken) {
      setLinkDead(true);
      return;
    }
    setError(result.error);
  }

  // FR-018: expired, used, superseded, unknown and missing all land here
  // with one message. Telling someone *which* kind of invalid their token
  // is tells a stranger holding a guessed link whether the account is real.
  if (linkDead) {
    return (
      <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
        <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
          Link expired
        </div>
        <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
          This link doesn&apos;t work
        </h1>
        <p className="mb-5 text-center text-sm leading-relaxed text-text-muted">
          Reset links last an hour and can only be used once. If you&apos;ve requested
          more than one, only the newest will work.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-center text-[15px] font-bold text-on-accent shadow-lg shadow-accent-2/30"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // FR-019: no auto-login. Holding the mailbox justifies setting a
  // password, not handing over a live session -- and typing the new
  // password once, now, catches a mistyped password-manager entry while
  // they're still paying attention.
  if (done) {
    return (
      <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
        <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
          All set
        </div>
        <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
          Password updated
        </h1>
        <p className="mb-5 text-center text-sm leading-relaxed text-text-muted">
          You can log in with your new password now. Any other devices you were signed
          in on have been signed out.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-center text-[15px] font-bold text-on-accent shadow-lg shadow-accent-2/30"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
      <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
        Almost there
      </div>
      <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
        Choose a new password
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-text-muted">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            className={fieldClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-pop">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-[15px] font-bold text-on-accent shadow-lg shadow-accent-2/30 transition-opacity disabled:cursor-not-allowed disabled:opacity-85"
        >
          {pending ? "Saving…" : "Set new password"}
        </button>
      </form>

      <p className="mt-3.5 text-center font-mono text-[10px] leading-relaxed text-text-dim">
        This link expires an hour after it was sent.
      </p>
    </div>
  );
}
