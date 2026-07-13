"use client";

import "./globals.css";
import { ErrorState } from "@/components/errors/error-state";

// Root-layout failures error.tsx can't reach -- must define its own
// <html>/<body>, since it replaces the root layout entirely when active
// (globals.css is imported directly here for the same reason; the Sora/
// Space Mono font variables from layout.tsx aren't available on this
// separate root, an acceptable degradation for this rare fallback path).
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          eyebrow="Critical hit"
          code="500"
          title="Something broke on our end"
          message="Our server took an unexpected hit. It's not you — the team's already been pinged. Give it a moment and try again."
          primary={{ label: "Try again", onClick: unstable_retry }}
          secondary={{ label: "Back to home", href: "/" }}
          footnote="If this keeps happening, let us know."
          refCode={error.digest}
        />
      </body>
    </html>
  );
}
