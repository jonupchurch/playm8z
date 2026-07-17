import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PostGameForm } from "./post-game-form";

// createPosting reaches @/db; the form only calls it on submit, which these
// tests don't do -- mock it so the module graph stays light.
vi.mock("@/lib/actions/create-posting", () => ({ createPosting: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const ratifiedGames = [
  { canonical: "Valorant", aliases: [] },
  { canonical: "Valheim", aliases: [] },
  { canonical: "D&D 5e", aliases: ["dnd 5e"] },
];

function renderForm() {
  render(
    <PostGameForm
      hostHandle="host"
      hostAvatarColor={null}
      hostAvatarImage={null}
      hostImage={null}
      gameSuggestions={[]}
      ratifiedGames={ratifiedGames}
      genres={["FPS"]}
    />,
  );
  return screen.getByLabelText("Game");
}

describe("game typeahead (036/FR-001)", () => {
  it("offers matching existing games as you type", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "val" } });
    const list = screen.getByRole("listbox");
    expect(within(list).getByRole("option", { name: "Valorant" })).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: "Valheim" })).toBeInTheDocument();
  });

  it("sets the field to the canonical name when a suggestion is picked", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "valor" } });
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: "Valorant" });
    fireEvent.mouseDown(within(option).getByRole("button", { name: "Valorant" }));
    expect((input as HTMLInputElement).value).toBe("Valorant");
  });

  it("shows nothing for a too-short query", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "v" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not suggest when the value already exactly matches", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "Valorant" } });
    // No typeahead dropdown (scoped to the listbox, not the region <select>).
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe('"Did you mean?" (036/FR-004/005)', () => {
  it("appears on a near-miss and corrects the field on click", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "Valornt" } });
    const nudge = screen.getByRole("button", { name: "Valorant" });
    expect(nudge).toBeInTheDocument();
    fireEvent.click(nudge);
    expect((input as HTMLInputElement).value).toBe("Valorant");
  });

  it("appears for an alias and points at the canonical", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "dnd 5e" } });
    expect(screen.getByRole("button", { name: "D&D 5e" })).toBeInTheDocument();
  });

  it("is silent on an exact canonical match (SC-003 -- no false nudge)", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "Valorant" } });
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });

  it("is silent on a genuinely new game (SC-004 -- free entry preserved)", () => {
    const input = renderForm();
    fireEvent.change(input, { target: { value: "Chess" } });
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("Chess"); // never rewritten
  });
});

describe("degrades with an empty catalog (FR-008)", () => {
  it("adds no typeahead or nudge when there are no ratified games", () => {
    render(
      <PostGameForm
        hostHandle="host"
        hostAvatarColor={null}
        hostAvatarImage={null}
        hostImage={null}
        gameSuggestions={[]}
        ratifiedGames={[]}
        genres={["FPS"]}
      />,
    );
    const input = screen.getByLabelText("Game");
    fireEvent.change(input, { target: { value: "valorant" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });
});
