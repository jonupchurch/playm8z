import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingHero } from "./landing-hero";
import type { ListingCardPosting } from "@/components/listings/listing-card";

const posting: ListingCardPosting = {
  id: "11111111-1111-1111-1111-111111111111",
  hostHandle: "mara",
  hostAvatarColor: "amber-orange",
  hostAvatarImage: null,
  hostImage: null,
  game: "Helldivers 2",
  genre: "Co-op PvE",
  title: "Casual dives — all welcome",
  blurb: "Here to blow stuff up and laugh.",
  vibe: "fun",
  region: "na-west",
  seatsTotal: 4,
  seatsOpen: 2,
  createdAt: new Date(Date.now() - 5 * 60_000),
};

const secondPosting: ListingCardPosting = {
  ...posting,
  id: "22222222-2222-2222-2222-222222222222",
  hostHandle: "wren",
  game: "Pathfinder 2e",
  genre: "TTRPG",
  region: "eu-west",
};

describe("LandingHero", () => {
  it("shows a real, honest open-parties count and reuses the real total-player count in the 'Join N' line (FR-003/FR-004)", () => {
    render(<LandingHero openPartiesNow={7} totalPlayers={48000} heroPostings={[]} />);
    expect(screen.getByText(/7 open parties right now/)).toBeInTheDocument();
    expect(screen.getByText(/Join 48,000\+ gamers already matched/)).toBeInTheDocument();
  });

  it("wires the hero CTAs to sign-up and Browse (FR-008)", () => {
    render(<LandingHero openPartiesNow={0} totalPlayers={0} heroPostings={[]} />);
    expect(screen.getByRole("link", { name: /Get started/ })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Browse games" })).toHaveAttribute("href", "/browse");
  });

  it("shows a clearly-decorative fallback, never a fabricated card, when zero postings are open (research.md #4/FR-005)", () => {
    render(<LandingHero openPartiesNow={0} totalPlayers={0} heroPostings={[]} />);
    expect(screen.getByText("No open parties yet")).toBeInTheDocument();
    expect(screen.queryByText("Helldivers 2")).not.toBeInTheDocument();
  });

  it("shows a real, currently-open posting's actual game/title/host when at least one exists (US3)", () => {
    render(<LandingHero openPartiesNow={1} totalPlayers={1} heroPostings={[posting]} />);
    expect(screen.getByText("@mara")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casual dives — all welcome" })).toBeInTheDocument();
    expect(screen.queryByText("No open parties yet")).not.toBeInTheDocument();
  });

  it("shows a second, smaller real posting when a second one exists (US3 Scenario 2)", () => {
    render(<LandingHero openPartiesNow={2} totalPlayers={2} heroPostings={[posting, secondPosting]} />);
    expect(screen.getByText("Pathfinder 2e")).toBeInTheDocument();
    expect(screen.getByText("TTRPG · EU-West", { exact: false })).toBeInTheDocument();
  });

  it("does not show a second card when only one open posting exists", () => {
    render(<LandingHero openPartiesNow={1} totalPlayers={1} heroPostings={[posting]} />);
    expect(screen.queryByText("Pathfinder 2e")).not.toBeInTheDocument();
  });
});
