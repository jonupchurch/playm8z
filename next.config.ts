import type { NextConfig } from "next";

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
};

export default nextConfig;
