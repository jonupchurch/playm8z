import { ErrorState } from "@/components/errors/error-state";

export default function NotFound() {
  return (
    <ErrorState
      eyebrow="Party not found"
      code="404"
      title="This lobby is empty"
      message="The page you're looking for got disbanded, moved, or never existed. Let's find you a new party."
      primary={{ label: "Back to home", href: "/" }}
      secondary={{ label: "Browse games", href: "/browse" }}
      footnote="Lost? Try search or the browse page."
    />
  );
}
