import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingCard, relativeAge } from "./listing-card";
import type { OpenPosting } from "@/lib/postings/get-open-postings";

const basePosting: OpenPosting = {
  id: "11111111-1111-1111-1111-111111111111",
  hostId: "22222222-2222-2222-2222-222222222222",
  hostHandle: "mara",
  hostAvatarColor: "amber-orange",
  game: "Helldivers 2",
  title: "Casual Dives — all welcome",
  blurb: "Here to blow stuff up and laugh.",
  vibe: "fun",
  region: "na-west",
  seatsTotal: 4,
  seatsOpen: 2,
  createdAt: new Date(Date.now() - 5 * 60_000),
};

describe("ListingCard", () => {
  it("renders host handle, region, game, title, blurb, vibe tag, and seat count", () => {
    render(<ListingCard posting={basePosting} />);

    expect(screen.getByText("@mara")).toBeInTheDocument();
    expect(screen.getByText("NA-West", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Helldivers 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casual Dives — all welcome" })).toBeInTheDocument();
    expect(screen.getByText("Here to blow stuff up and laugh.")).toBeInTheDocument();
    expect(screen.getByText("Fun")).toBeInTheDocument();
    expect(screen.getByText("2/4 open")).toBeInTheDocument();
  });

  it("links to the listing detail page for this posting", () => {
    render(<ListingCard posting={basePosting} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/listing/11111111-1111-1111-1111-111111111111",
    );
  });

  it("shows the Serious tag for a serious-vibe posting", () => {
    render(<ListingCard posting={{ ...basePosting, vibe: "serious" }} />);
    expect(screen.getByText("Serious")).toBeInTheDocument();
  });

  it("falls back to a 'P' initial when the host has no handle", () => {
    render(<ListingCard posting={{ ...basePosting, hostHandle: "" }} />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });
});

describe("relativeAge", () => {
  const now = new Date("2026-01-01T12:00:00Z").getTime();

  it("formats minutes for under an hour", () => {
    expect(relativeAge(new Date(now - 5 * 60_000), now)).toBe("5m ago");
  });

  it("formats hours for under a day", () => {
    expect(relativeAge(new Date(now - 3 * 60 * 60_000), now)).toBe("3h ago");
  });

  it("formats days for a day or more", () => {
    expect(relativeAge(new Date(now - 2 * 24 * 60 * 60_000), now)).toBe("2d ago");
  });
});
