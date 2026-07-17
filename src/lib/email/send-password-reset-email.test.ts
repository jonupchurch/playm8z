import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));
vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }));

import { sendPasswordResetEmail } from "./send-password-reset-email";
import { sendPasswordResetUnavailableEmail } from "./send-password-reset-unavailable-email";

const TOKEN = "b".repeat(64);

function lastCall() {
  return sendEmailMock.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  sendEmailMock.mockResolvedValue({ sent: true, id: "abc-123" });
  vi.stubEnv("APP_URL", "https://www.playm8z.net");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendPasswordResetEmail", () => {
  it("links to the reset screen on the real site, never localhost", async () => {
    await sendPasswordResetEmail({ email: "player@example.com" }, TOKEN);
    const { text, html } = lastCall();
    expect(text).toContain(`https://www.playm8z.net/reset-password?token=${TOKEN}`);
    expect(text).not.toContain("localhost");
    expect(html).not.toContain("localhost");
  });

  it("keys idempotency on the token so a re-request still sends", async () => {
    await sendPasswordResetEmail({ email: "player@example.com" }, "b".repeat(64));
    const first = lastCall().idempotencyKey;
    await sendPasswordResetEmail({ email: "player@example.com" }, "c".repeat(64));
    // FR-009 mints a new token per request; keying on the user instead
    // would make Resend swallow the very re-send that supersede exists for.
    expect(lastCall().idempotencyKey).not.toBe(first);
    expect(lastCall().idempotencyKey.length).toBeLessThanOrEqual(256);
  });

  it("html-escapes the URL and the user's name", async () => {
    await sendPasswordResetEmail(
      { email: "player@example.com", name: '<script>alert("x")</script>' },
      TOKEN,
    );
    const { html } = lastCall();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("tells the reader the link is short-lived and single-use", async () => {
    await sendPasswordResetEmail({ email: "player@example.com" }, TOKEN);
    expect(lastCall().text).toMatch(/1 hour/);
    expect(lastCall().text).toMatch(/once/);
  });

  it("reassures a recipient who didn't ask for it", async () => {
    await sendPasswordResetEmail({ email: "player@example.com" }, TOKEN);
    // Anyone can trigger this mail for any address, so it must not read as
    // "your password is being changed".
    expect(lastCall().text).toMatch(/wasn't you/i);
  });

  it("always sends a plaintext part", async () => {
    await sendPasswordResetEmail({ email: "player@example.com" }, TOKEN);
    expect(lastCall().text).toBeTruthy();
    expect(lastCall().html).toBeTruthy();
  });

  it("returns rather than throws when the send fails, and logs it (FR-016)", async () => {
    sendEmailMock.mockResolvedValue({ sent: false, reason: "Domain is not verified" });
    await expect(
      sendPasswordResetEmail({ email: "player@example.com" }, TOKEN),
    ).resolves.toMatchObject({ sent: false });
    // The only place a failure can surface: the user is told it worked
    // regardless (FR-004).
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("player@example.com"));
  });

  it("stays quiet when no provider is configured -- the documented local path", async () => {
    sendEmailMock.mockResolvedValue({ sent: false, reason: "not-configured", logged: "..." });
    await sendPasswordResetEmail({ email: "player@example.com" }, TOKEN);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("sendPasswordResetUnavailableEmail (FR-005)", () => {
  it("contains NO reset link", async () => {
    await sendPasswordResetUnavailableEmail({ email: "g@example.com" });
    const { text, html } = lastCall();
    // The whole point of this message. A Google account has no password;
    // a link here would hand it a second way in that nobody asked for.
    expect(text).not.toContain("/reset-password");
    expect(html).not.toContain("/reset-password");
    expect(text).not.toContain("token=");
    expect(html).not.toContain("token=");
  });

  it("points at Google sign-in instead", async () => {
    await sendPasswordResetUnavailableEmail({ email: "g@example.com" });
    const { text } = lastCall();
    expect(text).toMatch(/Google/);
    expect(text).toContain("https://www.playm8z.net/login");
  });

  it("says nothing about the account changing", async () => {
    await sendPasswordResetUnavailableEmail({ email: "g@example.com" });
    expect(lastCall().text).toMatch(/nothing about your account has changed/i);
  });

  it("has a different subject from the real reset mail -- they are not the same message", async () => {
    await sendPasswordResetEmail({ email: "a@example.com" }, TOKEN);
    const resetSubject = lastCall().subject;
    await sendPasswordResetUnavailableEmail({ email: "a@example.com" });
    expect(lastCall().subject).not.toBe(resetSubject);
  });

  it("always sends a plaintext part", async () => {
    await sendPasswordResetUnavailableEmail({ email: "g@example.com" });
    expect(lastCall().text).toBeTruthy();
    expect(lastCall().html).toBeTruthy();
  });
});
