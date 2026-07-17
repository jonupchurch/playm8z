import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl } from "./app-url";

// `vitest.config.ts` calls process.loadEnvFile(".env.local"), so ambient
// values leak into tests. Every case below stubs what it depends on --
// including stubbing to undefined -- so none of these silently pass or
// fail based on what happens to be in a given developer's .env.local.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appUrl", () => {
  it("uses APP_URL when set", () => {
    vi.stubEnv("APP_URL", "https://www.playm8z.net");
    expect(appUrl()).toBe("https://www.playm8z.net");
  });

  it("strips a trailing slash so callers can concatenate a path safely", () => {
    vi.stubEnv("APP_URL", "https://www.playm8z.net/");
    expect(appUrl()).toBe("https://www.playm8z.net");
    vi.stubEnv("APP_URL", "https://www.playm8z.net///");
    expect(appUrl()).toBe("https://www.playm8z.net");
  });

  it("falls back to Vercel's canonical production domain when APP_URL is unset", () => {
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.playm8z.net");
    expect(appUrl()).toBe("https://www.playm8z.net");
  });

  // VERCEL_URL is the per-deployment host. A link built from it outlives
  // the deployment that sent it, so a verification email from a preview
  // would point at a URL that may be gone by the time it's clicked.
  it("ignores VERCEL_URL -- a per-deployment host must never reach an email", () => {
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    vi.stubEnv("VERCEL_URL", "playm8z-h4b4scox0-jupchurch.vercel.app");
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("falls back to localhost only when nothing else is set", () => {
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    expect(appUrl()).toBe("http://localhost:3000");
  });

  // THE regression test. The old code read `process.env.NEXTAUTH_URL`,
  // which was set nowhere in the repo -- so the localhost fallback always
  // won and every production link pointed at localhost. It survived
  // because it is invisible from inside the app: locally the fallback is
  // correct, and in production the link was only console.log'd.
  //
  // So this asserts the property that actually matters and that nothing
  // else here does: given a production-shaped environment, the result must
  // not be localhost. It fails on the old code and on any future rename
  // that leaves the real variable unread.
  it("never returns localhost in a production-shaped environment (regression: NEXTAUTH_URL was never set)", () => {
    vi.stubEnv("APP_URL", "https://www.playm8z.net");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(appUrl()).not.toContain("localhost");

    // ...and the same holds via the inferred path, with APP_URL absent.
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.playm8z.net");
    expect(appUrl()).not.toContain("localhost");
  });

  // Unit tests can prove the resolution order but can never prove that
  // production's env is actually populated -- which is exactly how the
  // original bug survived. This is the guard that would surface it: on a
  // deployed environment, falling through to localhost is always wrong and
  // must be visible in the logs rather than silently shipped in a link.
  it("shouts when it falls through to localhost on a deployed environment", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    vi.stubEnv("VERCEL_ENV", "production");

    expect(appUrl()).toBe("http://localhost:3000");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("APP_URL"));
    error.mockRestore();
  });

  it("stays quiet about the localhost fallback when running locally, where it's correct", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);

    expect(appUrl()).toBe("http://localhost:3000");
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("returns an absolute http(s) origin, never a relative path", () => {
    vi.stubEnv("APP_URL", "https://www.playm8z.net");
    expect(appUrl()).toMatch(/^https?:\/\//);
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    expect(appUrl()).toMatch(/^https?:\/\//);
  });
});
