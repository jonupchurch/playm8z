import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isResetTokenLive } from "@/lib/auth/password-reset-token";

export const metadata: Metadata = {
  title: "Choose a new password",
};

// The emailed link's destination. The token rides in the query string
// rather than the path so it never lands in a route param that might get
// logged as a page name; it is single-use and short-lived either way.
//
// A missing token is treated exactly like an expired one -- one message for
// every failure (FR-018), never a hint about which.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  // ?token=a&token=b arrives as an array. Take nothing rather than guess,
  // and let it fall through to the invalid-link state.
  const rawToken = typeof token === "string" ? token : "";

  // Checked here, on load, so a dead link says so immediately instead of
  // making someone invent a password first and only then breaking the news.
  // This does NOT consume the token, and is not the real gate -- the link
  // can still die between now and submit, and completePasswordReset()'s own
  // atomic redemption is what actually decides.
  const linkLive = rawToken ? await isResetTokenLive(rawToken) : false;

  return <ResetPasswordForm token={linkLive ? rawToken : ""} />;
}
