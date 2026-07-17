"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/request-password-reset";

const fieldClass =
  "w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent-2";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await requestPasswordReset({ email });

    setPending(false);
    if (result.success) {
      setSent(true);
      return;
    }
    // Only ever a malformed address -- a fact about the string, not about
    // whether anyone owns it. The action returns success for every
    // well-formed address, known or not (FR-004).
    setError(result.error);
  }

  // FR-004's UI half. This screen is a dead end that says the same thing
  // for a registered address, a Google-only account, and an address with no
  // account at all. Do NOT "improve" this into "we've sent an email to
  // <address>" or "check your inbox" -- that asserts the address exists,
  // which is exactly what the whole flow is built not to reveal, and it
  // would be a lie in two of the three cases.
  if (sent) {
    return (
      <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
        <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
          Check your inbox
        </div>
        <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
          Reset link on its way
        </h1>
        <p className="mb-5 text-center text-sm leading-relaxed text-text-muted">
          If that address has a playm8z account, we&apos;ve emailed a link to reset its
          password. The link expires in an hour and can only be used once.
        </p>
        <p className="mb-5 text-center text-sm leading-relaxed text-text-muted">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-accent-2 underline hover:text-accent"
          >
            try a different address
          </button>
          .
        </p>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-center text-[15px] font-bold text-on-accent shadow-lg shadow-accent-2/30"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
      <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
        Locked out?
      </div>
      <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
        Reset your password
      </h1>
      <p className="mb-5 text-center text-sm leading-relaxed text-text-muted">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new
        password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
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
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-3.5 text-center font-mono text-[10px] leading-relaxed text-text-dim">
        Remembered it?{" "}
        <Link href="/login" className="text-accent-2 hover:text-accent">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
