import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Required for forbidden()/unauthorized() (app/forbidden.tsx,
    // app/unauthorized.tsx) -- research.md #1.
    authInterrupts: true,
  },
};

export default nextConfig;
