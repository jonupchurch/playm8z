import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <div className="w-full max-w-[420px] rounded-[20px] border border-border bg-surface-2 p-8 text-center shadow-2xl">
      <div
        className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${
          success ? "border-success/50 bg-success/15" : "border-pop/50 bg-pop/15"
        }`}
      >
        <span className={`text-3xl font-bold ${success ? "text-success" : "text-pop"}`}>
          {success ? "✓" : "!"}
        </span>
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-text">
        {success ? "Email verified!" : "Link expired or already used"}
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-text-muted">
        {success
          ? "You're all set — posting, applying, and messaging are unlocked."
          : "Log in and request a fresh link from your account."}
      </p>
      <Link
        href={success ? "/" : "/login"}
        className="block w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-[15px] font-bold text-on-accent"
      >
        {success ? "Continue" : "Log in"}
      </Link>
    </div>
  );
}
