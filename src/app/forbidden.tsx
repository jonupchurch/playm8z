import { ErrorState } from "@/components/errors/error-state";

// Insufficient role (FR-008: 403) -- same shared visual as unauthorized.tsx
// (FR-013), driven by calling forbidden() from require-role.ts.
export default function Forbidden() {
  return (
    <ErrorState
      eyebrow="Access denied"
      code="403"
      title="You don't have access to this"
      message="This page needs a different account or permission level. Try logging in, or head back to safer ground."
      primary={{ label: "Log in", href: "/login" }}
      secondary={{ label: "Back to home", href: "/" }}
      footnote="Think this is a mistake? Contact support."
    />
  );
}
