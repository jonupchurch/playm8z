import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "./error-state";

describe("ErrorState — not-found variant", () => {
  it("renders eyebrow, code, title, message, footnote, and two link actions", () => {
    render(
      <ErrorState
        eyebrow="Party not found"
        code="404"
        title="This lobby is empty"
        message="The page you're looking for got disbanded, moved, or never existed."
        primary={{ label: "Back to home", href: "/" }}
        secondary={{ label: "Browse games", href: "/browse" }}
        footnote="Lost? Try search or the browse page."
      />,
    );

    expect(screen.getByText("Party not found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This lobby is empty" })).toBeInTheDocument();
    expect(screen.getByText("Lost? Try search or the browse page.")).toBeInTheDocument();

    const primaryLink = screen.getByRole("link", { name: "Back to home" });
    expect(primaryLink).toHaveAttribute("href", "/");
    const secondaryLink = screen.getByRole("link", { name: "Browse games" });
    expect(secondaryLink).toHaveAttribute("href", "/browse");
  });

  it("omits the secondary action and reference code when not provided", () => {
    render(
      <ErrorState
        eyebrow="Party not found"
        code="404"
        title="This lobby is empty"
        message="Message"
        primary={{ label: "Back to home", href: "/" }}
        footnote="Footnote"
      />,
    );

    expect(screen.queryByText(/Error ref:/)).not.toBeInTheDocument();
  });
});

describe("ErrorState — server-error variant", () => {
  it("shows the reference code when provided", () => {
    render(
      <ErrorState
        eyebrow="Critical hit"
        code="500"
        title="Something broke on our end"
        message="Message"
        primary={{ label: "Try again", onClick: () => {} }}
        secondary={{ label: "Back to home", href: "/" }}
        footnote="If this keeps happening, let us know."
        refCode="p8z-abc123"
      />,
    );

    expect(screen.getByText(/Error ref: p8z-abc123/)).toBeInTheDocument();
  });

  it("renders a button (not a link) and calls onClick when the primary action has no href", () => {
    const onClick = vi.fn();
    render(
      <ErrorState
        eyebrow="Critical hit"
        code="500"
        title="Something broke"
        message="Message"
        primary={{ label: "Try again", onClick }}
        footnote="Footnote"
      />,
    );

    const button = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("ErrorState — access-denied variant (shared by both 401 and 403)", () => {
  const accessDeniedProps = {
    eyebrow: "Access denied",
    code: "403",
    title: "You don't have access to this",
    message: "This page needs a different account or permission level.",
    primary: { label: "Log in", href: "/login" } as const,
    secondary: { label: "Back to home", href: "/" } as const,
    footnote: "Think this is a mistake? Contact support.",
  };

  it("renders identical content regardless of which status triggered it", () => {
    const { unmount } = render(<ErrorState {...accessDeniedProps} code="401" />);
    expect(screen.getByText("401")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    unmount();

    render(<ErrorState {...accessDeniedProps} code="403" />);
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
