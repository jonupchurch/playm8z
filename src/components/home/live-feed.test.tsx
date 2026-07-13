import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LiveFeed } from "./live-feed";
import type { OpenPosting } from "@/lib/postings/get-open-postings";

function posting(overrides: Partial<OpenPosting>): OpenPosting {
  return {
    id: crypto.randomUUID(),
    hostId: crypto.randomUUID(),
    hostName: "Host",
    hostAvatarColor: "amber-orange",
    game: "Generic Game",
    title: "A listing",
    blurb: "blurb",
    vibe: "fun",
    region: "na-west",
    seatsTotal: 4,
    seatsOpen: 2,
    createdAt: new Date(),
    ...overrides,
  };
}

const sample: OpenPosting[] = [
  posting({
    game: "Valorant",
    title: "Ranked grind",
    hostName: "Vex",
    vibe: "serious",
    region: "eu-west",
    seatsOpen: 3,
    createdAt: new Date(Date.now() - 2 * 60_000),
  }),
  posting({
    game: "Helldivers 2",
    title: "Casual dives",
    hostName: "Mara",
    vibe: "fun",
    region: "na-west",
    seatsOpen: 1,
    createdAt: new Date(Date.now() - 60 * 60_000),
  }),
];

function cardTitles() {
  return screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
}

describe("LiveFeed — search", () => {
  it("narrows to postings whose game, title, or host matches the query", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    fireEvent.change(screen.getByLabelText("Search a game, player, or vibe"), {
      target: { value: "valorant" },
    });
    expect(cardTitles()).toEqual(["Ranked grind"]);
  });

  it("shows the empty state when nothing matches", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    fireEvent.change(screen.getByLabelText("Search a game, player, or vibe"), {
      target: { value: "nonexistent-xyz" },
    });
    expect(screen.getByText("No parties match that yet.")).toBeInTheDocument();
  });
});

describe("LiveFeed — Vibe + Region chips combine (AND)", () => {
  it("only shows postings matching both a selected vibe and region", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Serious" }));
    fireEvent.click(screen.getByRole("button", { name: "EU-West" }));
    expect(cardTitles()).toEqual(["Ranked grind"]);
  });

  it("returns to the full feed when cleared back to All / Any region", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Serious" }));
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(cardTitles().sort()).toEqual(["Casual dives", "Ranked grind"].sort());
  });
});

describe("LiveFeed — sort", () => {
  it("orders by most recent by default", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    expect(cardTitles()).toEqual(["Ranked grind", "Casual dives"]);
  });

  it("orders by open seats descending when 'Open seats' is selected", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open seats" }));
    expect(cardTitles()).toEqual(["Ranked grind", "Casual dives"]);
  });
});

describe("LiveFeed — trending selection", () => {
  it("selecting a trending game sets it as the search query", () => {
    render(
      <LiveFeed postings={sample} trending={[{ game: "Helldivers 2", count: 1 }]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Helldivers 2/ }));
    expect(cardTitles()).toEqual(["Casual dives"]);
    expect(screen.getByLabelText("Search a game, player, or vibe")).toHaveValue("Helldivers 2");
  });
});

describe("LiveFeed — result count", () => {
  it("announces the current result count", () => {
    render(<LiveFeed postings={sample} trending={[]} />);
    expect(screen.getByText("2 open right now")).toBeInTheDocument();
  });
});
