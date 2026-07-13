"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/errors/error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
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
  );
}
