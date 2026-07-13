import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows guidance copy and a 'Post this game' action", () => {
    render(<EmptyState searchTerm="" />);
    expect(screen.getByText("No parties match that yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post this game" })).toHaveAttribute("href", "/post");
  });

  it("carries the current search term over to the Post a Game link", () => {
    render(<EmptyState searchTerm="Valorant" />);
    expect(screen.getByRole("link", { name: "Post this game" })).toHaveAttribute(
      "href",
      "/post?game=Valorant",
    );
  });
});
