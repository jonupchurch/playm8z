"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useHandleAvailability } from "@/lib/hooks/use-handle-availability";

const fieldClass =
  "w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent-2";

function tabClass(active: boolean) {
  const base =
    "flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors";
  return active
    ? `${base} bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] text-on-accent`
    : `${base} text-text-muted hover:text-text`;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleCheck = useHandleAvailability(handle, isSignup);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    if (isSignup) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(
        isSignup
          ? "Account created, but signing you in failed -- try logging in."
          : "Incorrect email or password.",
      );
      setPending(false);
      return;
    }
    // Signup always goes straight to onboarding (a brand-new account
    // already has a handle from registration, which would otherwise
    // satisfy /continue's check and wrongly skip it) -- see continue/page.tsx.
    router.push(isSignup ? "/onboarding" : "/continue");
  }

  return (
    <div className="w-full max-w-105 rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
      <div className="mb-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-accent-2">
        Assemble your party
      </div>
      <h1 className="mb-5 text-center text-2xl font-bold tracking-tight text-text">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>

      <div className="mb-5 flex gap-1 rounded-[11px] border border-border bg-bg p-1">
        <Link href="/login" className={tabClass(!isSignup)}>
          Log in
        </Link>
        <Link href="/signup" className={tabClass(isSignup)}>
          Sign up
        </Link>
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { redirectTo: "/continue" })}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-[11px] border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-border/40"
      >
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full bg-[linear-gradient(135deg,#4285f4,#ea4335)]"
        />
        Continue with Google
      </button>

      <div className="mb-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] text-text-dim">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        {isSignup && (
          <div>
            <label htmlFor="handle" className="mb-1.5 block text-xs font-semibold text-text-muted">
              Username
            </label>
            <input
              id="handle"
              name="handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="pick a handle"
              autoComplete="username"
              required
              className={fieldClass}
              aria-describedby="handle-status"
            />
            <p id="handle-status" className="mt-1 min-h-4 text-xs" aria-live="polite">
              {handleCheck?.handle === handle &&
                handle.length > 0 &&
                (handleCheck.available ? (
                  <span className="text-success">Available</span>
                ) : (
                  <span className="text-pop">
                    {handleCheck.reason ?? "That handle is already taken."}
                  </span>
                ))}
            </p>
          </div>
        )}

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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            className={fieldClass}
          />
        </div>

        {!isSignup && (
          <Link href="/forgot-password" className="self-end text-xs text-accent-2 hover:text-accent">
            Forgot password?
          </Link>
        )}

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
          {pending
            ? isSignup
              ? "Creating account…"
              : "Logging in…"
            : isSignup
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="mt-3.5 text-center font-mono text-[10px] leading-relaxed text-text-dim">
        {isSignup ? (
          "By signing up you agree to our Terms & Community Guidelines."
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-accent-2">
              Switch to Sign up above.
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
