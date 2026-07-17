import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

const base = {
  avatarImage: null,
  googleImage: null,
  avatarColor: "amber-orange",
  handle: "Gravytraining",
};

describe("Avatar precedence (FR-005)", () => {
  it("shows the uploaded image when present, over everything else", () => {
    render(
      <Avatar {...base} avatarImage="https://blob.example/up.jpg" googleImage="https://g.example/g.jpg" />,
    );
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.src).toBe("https://blob.example/up.jpg");
  });

  it("falls back to the Google photo when there is no upload", () => {
    render(<Avatar {...base} googleImage="https://g.example/g.jpg" />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toBe("https://g.example/g.jpg");
  });

  it("falls back to the gradient block + initial when there is no image at all", () => {
    render(<Avatar {...base} />);
    const el = screen.getByRole("img");
    expect(el.tagName).not.toBe("IMG");
    expect(el).toHaveTextContent("G"); // handle initial, uppercased
  });
});

describe("Avatar broken-image fallback (FR-007)", () => {
  it("degrades to the gradient block when the image fails to load", () => {
    render(<Avatar {...base} googleImage="https://g.example/rotated-away.jpg" />);
    const img = screen.getByRole("img");
    expect(img.tagName).toBe("IMG");

    fireEvent.error(img); // Google rotated the URL / Blob deleted / 404

    const fallback = screen.getByRole("img");
    expect(fallback.tagName).not.toBe("IMG");
    expect(fallback).toHaveTextContent("G");
  });
});

describe("Avatar initial", () => {
  it("uppercases the handle's first character", () => {
    render(<Avatar {...base} handle="zoe" />);
    expect(screen.getByRole("img")).toHaveTextContent("Z");
  });

  it("uses a stable placeholder for an empty or missing handle", () => {
    render(<Avatar {...base} handle="" />);
    expect(screen.getByRole("img")).toHaveTextContent("P");
    render(<Avatar {...base} handle={null} />);
    // Two renders -> two elements; just assert one shows the placeholder.
    expect(screen.getAllByRole("img").some((el) => el.textContent === "P")).toBe(true);
  });

  it("handles a whitespace-only handle without crashing", () => {
    render(<Avatar {...base} handle="   " />);
    expect(screen.getByRole("img")).toHaveTextContent("P");
  });
});

describe("Avatar styling passthrough", () => {
  it("applies the call site's size/radius classes to both the image and the block", () => {
    const { rerender } = render(
      <Avatar {...base} avatarImage="https://blob.example/up.jpg" className="h-10 w-10 rounded-xl" />,
    );
    expect(screen.getByRole("img").className).toContain("h-10");
    expect(screen.getByRole("img").className).toContain("rounded-xl");

    rerender(<Avatar {...base} className="h-23 w-23 rounded-[24px] text-4xl" />);
    expect(screen.getByRole("img").className).toContain("h-23");
    expect(screen.getByRole("img").className).toContain("rounded-[24px]");
  });

  it("gives an unknown avatarColor the default gradient rather than nothing", () => {
    render(<Avatar {...base} avatarColor="not-a-real-swatch" />);
    const el = screen.getByRole("img");
    // Unknown swatch -> AVATAR_COLORS[0], never an empty background.
    expect(el.getAttribute("style")).toContain("gradient");
  });
});
