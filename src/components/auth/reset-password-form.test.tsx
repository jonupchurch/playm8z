import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { completeMock } = vi.hoisted(() => ({ completeMock: vi.fn() }));
vi.mock("@/lib/actions/complete-password-reset", () => ({
  completePasswordReset: completeMock,
}));

import { ResetPasswordForm } from "./reset-password-form";

const TOKEN = "d".repeat(64);

function submit(password: string) {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  completeMock.mockResolvedValue({ success: true });
});

describe("ResetPasswordForm", () => {
  it("submits the token with the new password", async () => {
    render(<ResetPasswordForm token={TOKEN} />);
    submit("brand-new-password");
    await waitFor(() =>
      expect(completeMock).toHaveBeenCalledWith({ token: TOKEN, password: "brand-new-password" }),
    );
  });

  it("shows a pending state while saving", async () => {
    let resolve!: (v: unknown) => void;
    completeMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ResetPasswordForm token={TOKEN} />);
    submit("brand-new-password");
    await waitFor(() => expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled());
    resolve({ success: true });
  });

  describe("a dead link", () => {
    // No token at all is the same story as an expired one, and must read
    // that way rather than as a broken form.
    it("shows the invalid-link state with no token, without ever calling the action", () => {
      render(<ResetPasswordForm token="" />);
      expect(screen.getByRole("heading", { name: "This link doesn't work" })).toBeInTheDocument();
      expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
      expect(completeMock).not.toHaveBeenCalled();
    });

    it("swaps the form for the invalid-link state when the server refuses the token", async () => {
      completeMock.mockResolvedValue({
        success: false,
        error: "That reset link is invalid or has expired. Request a new one and try again.",
        invalidToken: true,
      });
      render(<ResetPasswordForm token={TOKEN} />);
      submit("brand-new-password");

      // There's nothing to retry here -- keeping the form would invite
      // them to type the password again against a link that can't work.
      expect(await screen.findByRole("heading", { name: "This link doesn't work" })).toBeInTheDocument();
      expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    });

    it("offers a fresh request", () => {
      render(<ResetPasswordForm token="" />);
      expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
        "href",
        "/forgot-password",
      );
    });

    it("explains supersede, since 'I clicked the email' is the common case", () => {
      render(<ResetPasswordForm token="" />);
      expect(screen.getByText(/only the newest will work/i)).toBeInTheDocument();
    });
  });

  describe("a password problem", () => {
    // Distinct from a dead link: the link is fine, so keep the form.
    it("keeps the form and shows the message", async () => {
      completeMock.mockResolvedValue({
        success: false,
        error: "Password must be at least 8 characters.",
      });
      render(<ResetPasswordForm token={TOKEN} />);
      submit("short");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Password must be at least 8 characters.",
      );
      // Their link still works -- don't send them away to get another.
      expect(screen.getByLabelText("New password")).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "This link doesn't work" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("confirms and points at log in, without logging them in (FR-019)", async () => {
      render(<ResetPasswordForm token={TOKEN} />);
      submit("brand-new-password");

      expect(await screen.findByRole("heading", { name: "Password updated" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    });

    it("tells them their other devices were signed out (FR-013)", async () => {
      render(<ResetPasswordForm token={TOKEN} />);
      submit("brand-new-password");
      // A surprise logout on their phone should be explained, not discovered.
      expect(await screen.findByText(/other devices you were signed in on have been signed out/i)).toBeInTheDocument();
    });
  });
});
