import type { NextConfig } from "next";

// Content-Security-Policy + security response headers, applied to every route.
//
// XSS posture (audited 2026-07-18): the app renders NO user-authored HTML
// anywhere. Every piece of user content -- forum threads/replies, DMs, bios,
// listing text, handles -- is rendered as plain JSX text, which React escapes.
// The ONLY `dangerouslySetInnerHTML` in the codebase is the news body
// (article-body.tsx), which is admin/moderator-authored (role-gated at write
// time). So these headers are defense-in-depth, not the primary XSS control.
//
// The strict directives below (no plugins, no framing, locked base-uri and
// form-action) have no legitimate downside. `script-src`/`style-src` keep
// 'unsafe-inline' -- and 'unsafe-eval' for the dev/HMR bundle -- because
// Next's hydration bootstrap needs inline scripts; blocking those would need
// per-request nonces (a larger, separately-testable change tracked in
// docs/future-work.md). External scripts are still restricted to same-origin,
// so an injected `<script src="//evil">` is blocked regardless. Vercel
// Analytics/Speed Insights load same-origin (`/_vercel/*`), so 'self' covers
// them. The policy is identical in dev and prod so CI's e2e run (which uses
// `next dev`) exercises the exact policy production serves.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Required for forbidden()/unauthorized() (app/forbidden.tsx,
    // app/unauthorized.tsx) -- research.md #1.
    authInterrupts: true,
    // News cover image upload (029): Server Action requests default to
    // a 1MB body cap, well under upload-news-cover-image.ts's own 5MB
    // file-size limit -- any image over ~1MB was silently rejected by
    // the framework itself before that action's own validation ever
    // ran. 6mb leaves headroom for multipart/form-data's own boundary/
    // header overhead on a 5MB file (specs/029-news-cover-image-upload/
    // research.md).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
