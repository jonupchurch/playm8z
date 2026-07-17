import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, resendCtor } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  resendCtor: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
    constructor(key: string) {
      resendCtor(key);
    }
  },
}));

import { sendEmail } from "./send-email";

const options = {
  to: "player@example.com",
  subject: "Verify your email for playm8z",
  html: "<p>hi</p>",
  text: "hi",
  idempotencyKey: "verify-email/abc123",
};

beforeEach(() => {
  vi.clearAllMocks();
  // These flows are console-noisy by design (that's the whole point of the
  // no-provider fallback), so silence them rather than spray the reporter.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Never inherit ambient env: vitest.config.ts loads .env.local, so a
  // developer with a real RESEND_API_KEY there would otherwise have these
  // tests attempt live sends.
  vi.stubEnv("RESEND_API_KEY", undefined);
  vi.stubEnv("RESEND_EMAIL_DOMAIN", undefined);
  vi.stubEnv("EMAIL_FROM", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail without a provider configured", () => {
  it("logs instead of sending, and never touches Resend", async () => {
    const result = await sendEmail(options);
    expect(result).toEqual({ sent: false, reason: "not-configured", logged: "hi" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  // An unset key locally is the documented fallback; in production it's a
  // misconfiguration that would silently drop real users' mail.
  it("reports an error rather than quietly logging when the key is missing in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const result = await sendEmail(options);
    expect(result.sent).toBe(false);
    expect(result).not.toHaveProperty("logged");
    if (!result.sent) expect(result.reason).toMatch(/RESEND_API_KEY/);
    expect(console.error).toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("sendEmail with a provider configured", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_EMAIL_DOMAIN", "send.playm8z.net");
  });

  it("returns the id on success", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    await expect(sendEmail(options)).resolves.toEqual({ sent: true, id: "abc-123" });
    expect(resendCtor).toHaveBeenCalledWith("re_test_key");
  });

  // THE gotcha this module exists to contain: Resend's SDK reports API
  // failures by *returning* `{ error }`, not by throwing. A try/catch-only
  // wrapper sails straight past it and reports success.
  it("surfaces an error RETURN rather than mistaking it for success", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "Domain is not verified", name: "validation_error" } });
    const result = await sendEmail(options);
    expect(result).toEqual({ sent: false, reason: "Domain is not verified" });
    expect(console.error).toHaveBeenCalled();
  });

  it("does not throw when the transport itself throws -- callers have already committed DB writes", async () => {
    sendMock.mockRejectedValue(new Error("socket hang up"));
    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: "socket hang up" });
  });

  it("treats a response with neither data nor error as a failure, not a success", async () => {
    sendMock.mockResolvedValue({ data: null, error: null });
    const result = await sendEmail(options);
    expect(result.sent).toBe(false);
  });

  it("passes the idempotency key through so a retry cannot double-send", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    await sendEmail(options);
    expect(sendMock).toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: "verify-email/abc123" },
    );
  });

  // Resend 403s unless the from-domain matches a verified domain exactly.
  // We verified send.playm8z.net, so noreply@playm8z.net would be rejected
  // -- deriving from RESEND_EMAIL_DOMAIN is what keeps them in lockstep.
  it("derives the sender from the verified domain", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    await sendEmail(options);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "playm8z <noreply@send.playm8z.net>" }),
      expect.anything(),
    );
  });

  it("lets EMAIL_FROM override the derived sender", async () => {
    vi.stubEnv("EMAIL_FROM", "playm8z <hello@send.playm8z.net>");
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    await sendEmail(options);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "playm8z <hello@send.playm8z.net>" }),
      expect.anything(),
    );
  });

  it("refuses to send with no sender rather than guessing one", async () => {
    vi.stubEnv("RESEND_EMAIL_DOMAIN", undefined);
    const result = await sendEmail(options);
    expect(result.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("always sends a plaintext part alongside the html", async () => {
    sendMock.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    await sendEmail(options);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hi", html: "<p>hi</p>", to: ["player@example.com"] }),
      expect.anything(),
    );
  });
});
