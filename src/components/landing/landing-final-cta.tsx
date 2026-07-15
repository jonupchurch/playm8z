import Link from "next/link";

export function LandingFinalCta() {
  return (
    <div className="mx-auto max-w-275 px-6 py-20 sm:px-10">
      <div className="relative overflow-hidden rounded-3xl border border-accent/35 bg-[linear-gradient(135deg,rgba(255,176,0,0.12),rgba(255,59,107,0.1))] p-10 text-center sm:p-14">
        <div className="mb-4 font-mono text-[11px] tracking-[0.3em] text-accent-2 uppercase">Assemble your party</div>
        <h2 className="mb-4 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          Your next session is one click away.
        </h2>
        <p className="mx-auto mb-7.5 max-w-115 text-base leading-relaxed text-text-muted">
          Free to join. No credit card. Just better games with better people.
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-2xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-9 py-4 text-base font-bold text-on-accent shadow-[0_12px_32px_-10px_rgba(255,107,26,0.8)]"
        >
          Sign up free
        </Link>
      </div>
    </div>
  );
}
