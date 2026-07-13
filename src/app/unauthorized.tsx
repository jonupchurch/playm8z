import { ErrorState } from "@/components/errors/error-state";

// Not logged in (FR-008: 401) -- same shared visual as forbidden.tsx
// (FR-013), driven by calling unauthorized() from require-role.ts.
export default function Unauthorized() {
  return (
    <ErrorState
      eyebrow="Access denied"
      code="401"
      title="You don't have access to this"
      message="This page needs a different account or permission level. Try logging in, or head back to safer ground."
      primary={{ label: "Log in", href: "/login" }}
      secondary={{ label: "Back to home", href: "/" }}
      footnote="Think this is a mistake? Contact support."
    />
  );
}
