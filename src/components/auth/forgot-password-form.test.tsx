import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("@/lib/actions/request-password-reset", () => ({
  requestPasswordReset: requestMock,
}));

import { ForgotPasswordForm } from "./forgot-password-form";

function submit(email: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  requestMock.mockResolvedValue({ success: true });
});

describe("ForgotPasswordForm", () => {
  it("submits the address", async () => {
    render(<ForgotPasswordForm />);
    submit("player@example.com");
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith({ email: "player@example.com" }),
    );
  });

  it("shows a pending state while submitting", async () => {
    let resolve!: (v: unknown) => void;
    requestMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ForgotPasswordForm />);
    submit("player@example.com");

    await waitFor(() => expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled());
    resolve({ success: true });
  });

  it("surfaces a malformed-address error", async () => {
    requestMock.mockResolvedValue({ success: false, error: "Enter a valid email address." });
    render(<ForgotPasswordForm />);
    submit("nope");
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  // FR-004's UI half. The success copy must be conditional, and must not
  // name the address back -- both would assert that the account exists.
  describe("the success state does not confirm the address exists (FR-004)", () => {
    it("hedges with 'if that address has an account'", async () => {
      render(<ForgotPasswordForm />);
      submit("player@example.com");
      expect(await screen.findByText(/if that address has a playm8z account/i)).toBeInTheDocument();
    });

    it("never echoes the submitted address back", async () => {
      render(<ForgotPasswordForm />);
      submit("player@example.com");
      await screen.findByRole("heading", { name: "Reset link on its way" });
      // "We've emailed player@example.com" would be a lie for an unknown
      // address AND a confirmation for a real one.
      expect(screen.queryByText(/player@example\.com/)).not.toBeInTheDocument();
    });

    it("says the same thing regardless of which address was submitted", async () => {
      const { unmount } = render(<ForgotPasswordForm />);
      submit("registered@example.com");
      const first = (await screen.findByRole("heading", { name: "Reset link on its way" }))
        .parentElement?.textContent;
      unmount();

      render(<ForgotPasswordForm />);
      submit("nobody@example.com");
      const second = (await screen.findByRole("heading", { name: "Reset link on its way" }))
        .parentElement?.textContent;

      expect(first).toBe(second);
    });
  });

  it("tells the user the link is short-lived and single-use", async () => {
    render(<ForgotPasswordForm />);
    submit("player@example.com");
    expect(await screen.findByText(/expires in an hour and can only be used once/i)).toBeInTheDocument();
  });

  it("offers a way back to try another address", async () => {
    render(<ForgotPasswordForm />);
    submit("player@example.com");
    fireEvent.click(await screen.findByRole("button", { name: "try a different address" }));
    // Back to the form, not stuck on the dead end.
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("links back to log in", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", "/login");
  });
});
