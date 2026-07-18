import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/steam-import", () => ({ readSteamLibrary: vi.fn(), importSteamGames: vi.fn() }));

const { readSteamLibrary, importSteamGames } = await import("@/lib/actions/steam-import");
const { SteamImportDialog } = await import("./steam-import-dialog");
const mockRead = readSteamLibrary as unknown as ReturnType<typeof vi.fn>;
const mockImport = importSteamGames as unknown as ReturnType<typeof vi.fn>;

describe("SteamImportDialog", () => {
  it("pre-checks recent games, disables already-added, and imports the selection", async () => {
    mockRead.mockResolvedValueOnce({
      kind: "list",
      items: [
        { name: "Bravo", hoursPlayed: 100, recentlyPlayed: true, alreadyOnProfile: false },
        { name: "Alpha", hoursPlayed: 2, recentlyPlayed: false, alreadyOnProfile: true },
      ],
    });
    mockImport.mockResolvedValueOnce({ success: true, added: 1 });

    render(<SteamImportDialog />);

    const bravo = await screen.findByRole("checkbox", { name: /Bravo/ });
    expect(bravo).toBeChecked(); // recent, not already added -> pre-selected
    const alpha = screen.getByRole("checkbox", { name: /Alpha/ });
    expect(alpha).toBeChecked();
    expect(alpha).toBeDisabled(); // already on the profile

    fireEvent.click(screen.getByRole("button", { name: "Add 1 game" }));

    await waitFor(() => expect(mockImport).toHaveBeenCalledWith([{ name: "Bravo", hoursPlayed: 100 }]));
    expect(await screen.findByText(/Added 1 game/)).toBeInTheDocument();
  });

  it("Select all toggles every selectable game and flips to Clear all", async () => {
    mockRead.mockResolvedValueOnce({
      kind: "list",
      items: [
        { name: "Bravo", hoursPlayed: 100, recentlyPlayed: true, alreadyOnProfile: false },
        { name: "Charlie", hoursPlayed: 5, recentlyPlayed: false, alreadyOnProfile: false },
        { name: "Alpha", hoursPlayed: 2, recentlyPlayed: false, alreadyOnProfile: true },
      ],
    });
    render(<SteamImportDialog />);
    await screen.findByRole("checkbox", { name: /Bravo/ });
    expect(screen.getByRole("checkbox", { name: /Charlie/ })).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByRole("checkbox", { name: /Bravo/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Charlie/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Alpha/ })).toBeDisabled(); // already-added, untouched

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("checkbox", { name: /Bravo/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Charlie/ })).not.toBeChecked();
  });

  it("shows the private-library message, not an error", async () => {
    mockRead.mockResolvedValueOnce({ kind: "private" });
    render(<SteamImportDialog />);
    expect(await screen.findByText(/couldn't see your library/)).toBeInTheDocument();
  });

  it("shows a try-again message when Steam is unavailable", async () => {
    mockRead.mockResolvedValueOnce({ kind: "steam-unavailable" });
    render(<SteamImportDialog />);
    expect(await screen.findByText(/Steam isn't responding/)).toBeInTheDocument();
  });
});
