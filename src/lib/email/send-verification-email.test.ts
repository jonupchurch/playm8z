import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));
vi.mock("@/lib/email/send-email", () => ({ sendEmail: sendEmailMock }));

import { sendVerificationEmail } from "./send-verification-email";

const TOKEN = "a".repeat(64); // register/route.ts: randomBytes(32).toString("hex")

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

describe("sendVerificationEmail", () => {
  it("addresses the mail to the user and names the product in the subject", async () => {
    await sendVerificationEmail({ email: "player@example.com", name: "Jo" }, TOKEN);
    expect(lastCall()).toMatchObject({
      to: "player@example.com",
      subject: "Verify your email for playm8z",
    });
  });

  // THE regression. Before 2026-07-16 this built its link from
  // `NEXTAUTH_URL ?? "http://localhost:3000"` with NEXTAUTH_URL set
  // nowhere in the repo -- so every production email would have carried a
  // dead localhost link. The stub sender hid it: nobody reads a
  // console.log in production.
  it("builds the link from the real site URL, never localhost", async () => {
    await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
    const { text, html } = lastCall();
    expect(text).toContain("https://www.playm8z.net/api/auth/verify-email?");
    expect(text).not.toContain("localhost");
    expect(html).not.toContain("localhost");
  });

  it("points at the route that actually verifies, carrying both token and email", async () => {
    await sendVerificationEmail({ email: "player+tag@example.com" }, TOKEN);
    const { text } = lastCall();
    // The email is url-encoded: a raw "+" in a query string decodes to a
    // space, which would look up an address that doesn't exist.
    expect(text).toContain(
      `https://www.playm8z.net/api/auth/verify-email?token=${TOKEN}&email=player%2Btag%40example.com`,
    );
  });

  // Keyed on the token, not the user: a re-send issues a new token and must
  // actually go out, while retrying this same send must not double-deliver.
  it("keys idempotency on the one-shot token", async () => {
    await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
    expect(lastCall().idempotencyKey).toBe(`verify-email/${TOKEN}`);
    expect(lastCall().idempotencyKey.length).toBeLessThanOrEqual(256);
  });

  it("issues a different key for a different token, so a re-send is not suppressed", async () => {
    await sendVerificationEmail({ email: "player@example.com" }, "a".repeat(64));
    const first = lastCall().idempotencyKey;
    await sendVerificationEmail({ email: "player@example.com" }, "b".repeat(64));
    expect(lastCall().idempotencyKey).not.toBe(first);
  });

  it("greets by name when there is one, and neutrally when there isn't", async () => {
    await sendVerificationEmail({ email: "player@example.com", name: "Jo" }, TOKEN);
    expect(lastCall().text).toContain("Hi Jo,");
    await sendVerificationEmail({ email: "player@example.com", name: null }, TOKEN);
    expect(lastCall().text).toContain("Hi,");
  });

  it("escapes a user-supplied name rather than letting it inject markup", async () => {
    await sendVerificationEmail(
      { email: "player@example.com", name: '<script>alert("x")</script>' },
      TOKEN,
    );
    const { html } = lastCall();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  // The URL is ours, but it's url-encoded, not html-encoded -- a bare "&"
  // between query params is an unterminated entity inside an href.
  it("html-escapes the ampersand between query params", async () => {
    await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
    const { html } = lastCall();
    expect(html).toContain("&amp;email=");
    expect(html).not.toMatch(/[^p;]&email=/);
  });

  it("always includes a plaintext part", async () => {
    await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
    expect(lastCall().text).toBeTruthy();
    expect(lastCall().html).toBeTruthy();
  });

  describe("failure handling", () => {
    // register/route.ts and update-email.ts both commit a user row and a
    // token row BEFORE calling this. A throw here would fail a request
    // whose real work already landed.
    it("does not throw when the send fails", async () => {
      sendEmailMock.mockResolvedValue({ sent: false, reason: "Domain is not verified" });
      await expect(
        sendVerificationEmail({ email: "player@example.com" }, TOKEN),
      ).resolves.toMatchObject({ sent: false });
    });

    it("logs loudly on a real failure -- the account exists but has no way in", async () => {
      sendEmailMock.mockResolvedValue({ sent: false, reason: "Domain is not verified" });
      await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("player@example.com"));
    });

    it("stays quiet when no provider is configured -- that's the documented local path, not a fault", async () => {
      sendEmailMock.mockResolvedValue({ sent: false, reason: "not-configured", logged: "..." });
      await sendVerificationEmail({ email: "player@example.com" }, TOKEN);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("returns the result so a caller can react if it ever needs to", async () => {
      sendEmailMock.mockResolvedValue({ sent: true, id: "abc-123" });
      await expect(
        sendVerificationEmail({ email: "player@example.com" }, TOKEN),
      ).resolves.toEqual({ sent: true, id: "abc-123" });
    });
  });
});
