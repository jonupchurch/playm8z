// Shared across every moderation-queue feature (Admin Postings/017,
// Admin Forum/018) -- extracted from 017's own inline copy the moment
// a second real consumer (009's create-thread.ts, 010's post-reply.ts)
// needed the identical ruleset (research.md #3). Parameterized over
// whatever text the caller has (a posting's title/blurb; a thread's
// title/body; a reply's body) plus the author's account-age/post-count
// -- nothing here is posting-specific.
export type AutoFlagReason = "phishing_or_scam" | "boosting_service" | "new_account_first_post";

export const AUTO_FLAG_LABELS: Record<AutoFlagReason, string> = {
  phishing_or_scam: "Matched banned-phrase & external-link filter",
  boosting_service: "Matched boosting/paid-service keywords",
  new_account_first_post: "New account · first post (routine check)",
};

const SCAM_PATTERNS = [
  /free\s+(skins?|v-?bucks|robux|points)/i,
  /click\s*here/i,
  /enter your login/i,
  /claim now/i,
  /https?:\/\//i,
  /\.(biz|xyz|top|club)\b/i,
];

const BOOSTING_KEYWORDS = [/\bboost(ing)?\b/i, /rank\s*boost/i, /elo\s*boost/i, /carry\s*service/i, /paid\s*rank/i, /cheap\s*rank/i];

const NEW_ACCOUNT_THRESHOLD_DAYS = 3;

// A small, fixed, deterministic ruleset -- not a learned filter or
// external service. Whichever matches first wins; the new-account
// check only applies when nothing else matched.
export function computeAutoFlagReason(
  text: string,
  accountAgeDays: number,
  isFirstPosting: boolean,
): AutoFlagReason | null {
  if (SCAM_PATTERNS.some((pattern) => pattern.test(text))) return "phishing_or_scam";
  if (BOOSTING_KEYWORDS.some((pattern) => pattern.test(text))) return "boosting_service";
  if (accountAgeDays < NEW_ACCOUNT_THRESHOLD_DAYS && isFirstPosting) return "new_account_first_post";
  return null;
}
