import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagesLink } from "./messages-link";

describe("MessagesLink (037/US1)", () => {
  it("links to the inbox", () => {
    render(<MessagesLink unreadCount={0} />);
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/inbox");
  });

  it("shows no badge and a plain accessible name when there are no unread messages", () => {
    render(<MessagesLink unreadCount={0} />);
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("shows the count and a count-bearing accessible name when there are unread messages", () => {
    render(<MessagesLink unreadCount={3} />);
    expect(screen.getByRole("link", { name: "Messages, 3 unread" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 99+ (matching the notification bell)", () => {
    render(<MessagesLink unreadCount={150} />);
    expect(screen.getByRole("link", { name: "Messages, 150 unread" })).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
