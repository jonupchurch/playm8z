import Link from "next/link";

type ErrorAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export type ErrorStateProps = {
  eyebrow: string;
  code: string;
  title: string;
  message: string;
  primary: ErrorAction;
  secondary?: ErrorAction;
  footnote: string;
  refCode?: string;
};

function ActionButton({ action, variant }: { action: ErrorAction; variant: "primary" | "secondary" }) {
  const className =
    variant === "primary"
      ? "rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6.5 py-3.5 text-sm font-bold text-on-accent shadow-lg shadow-accent-2/30"
      : "rounded-xl border border-border bg-surface-2 px-6 py-3.5 text-sm font-semibold text-text";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

// The one shared visual layout backing all four Error Pages states
// (not-found, server-error, access-denied, maintenance) -- logo,
// disconnected-pawns motif, status code, title, message, two actions,
// footnote (FR-013). Content-only differences between states are
// supplied by the caller (app/not-found.tsx, app/error.tsx, etc.).
export function ErrorState({
  eyebrow,
  code,
  title,
  message,
  primary,
  secondary,
  footnote,
  refCode,
}: ErrorStateProps) {
  return (
    <div
      className="flex min-h-screen flex-col bg-bg text-text"
      style={{
        backgroundImage: "radial-gradient(circle at 50% 20%, rgba(255,107,26,0.13), transparent 55%)",
      }}
    >
      {/* No top logo bar -- the real site nav (site-header.tsx) already
          renders a clickable home logo on every page this component
          shows on, except actual maintenance mode, where every route
          redirects here anyway and a "go home" link would be moot. */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        <div
          aria-hidden="true"
          className="mb-8 flex items-end gap-3.5"
          style={{ animation: "floaty 4s ease-in-out infinite" }}
        >
          <div className="flex flex-col items-center">
            <span
              className="mb-[-3px] h-[22px] w-[22px] rounded-full"
              style={{
                background: "linear-gradient(150deg,#ffb000,#ff6b1a)",
                boxShadow: "0 0 20px -4px rgba(255,176,0,0.6)",
              }}
            />
            <span
              className="h-[34px] w-[44px]"
              style={{
                background: "linear-gradient(150deg,#ffb000,#ff6b1a)",
                clipPath: "polygon(32% 0,68% 0,100% 100%,0 100%)",
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 pb-4">
            <span className="h-0.5 w-1.5 rounded-full bg-[#5c4a33]" />
            <span className="h-0.5 w-1.5 rounded-full bg-[#5c4a33]" />
            <span className="h-0.5 w-1.5 rounded-full bg-[#3a2c1a]" />
          </div>
          <div className="flex flex-col items-center opacity-40 grayscale-[0.3]">
            <span className="mb-[-3px] h-[19px] w-[19px] rounded-full bg-[#6b5a45]" />
            <span
              className="h-[30px] w-[38px] bg-[#6b5a45]"
              style={{ clipPath: "polygon(32% 0,68% 0,100% 100%,0 100%)" }}
            />
          </div>
        </div>

        <div className="mb-3.5 font-mono text-xs uppercase tracking-[0.32em] text-accent-2">
          {eyebrow}
        </div>
        <div className="mb-4.5 bg-[linear-gradient(120deg,var(--color-accent),var(--color-pop))] bg-clip-text text-[104px] leading-[0.9] font-bold tracking-tight text-transparent">
          {code}
        </div>
        <h1 className="mb-3 max-w-[520px] text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-7 max-w-[480px] text-base leading-relaxed text-text-muted">{message}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <ActionButton action={primary} variant="primary" />
          {secondary && <ActionButton action={secondary} variant="secondary" />}
        </div>

        <div className="mt-7 font-mono text-[11px] leading-relaxed text-text-dim">
          {footnote}
          {refCode && (
            <>
              <br />
              <span className="text-text-dim/80">Error ref: {refCode}</span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
