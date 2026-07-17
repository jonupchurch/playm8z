"use client";

import { useState } from "react";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";

function gradientFor(avatarColor: string | null | undefined): string {
  return (
    AVATAR_COLORS.find((swatch) => swatch.id === avatarColor)?.gradient ??
    AVATAR_COLORS[0].gradient
  );
}

function initialOf(handle: string | null | undefined): string {
  return (handle?.trim()[0] || "P").toUpperCase();
}

export interface AvatarProps {
  /** The user's uploaded avatar (Blob URL). First choice. */
  avatarImage: string | null | undefined;
  /** The stored Google photo (`users.image`). Second choice. */
  googleImage: string | null | undefined;
  /** Gradient swatch id; the final fallback with the handle's initial. */
  avatarColor: string | null | undefined;
  handle: string | null | undefined;
  /**
   * Size, radius, and text-size classes for THIS call site, so each of the
   * ~30 places an avatar appears keeps its exact look (h-10 rounded-xl
   * text-base, h-23 rounded-[24px] text-4xl, …). The component owns only
   * the precedence and the broken-image fallback, never the dimensions.
   */
  className?: string;
  /** Optional alt; defaults to the handle. */
  alt?: string;
}

/**
 * The single avatar renderer (034/FR-008). Precedence, in order (FR-005):
 *   1. uploaded image (`avatarImage`)
 *   2. else the Google photo (`googleImage`)
 *   3. else the gradient block + handle initial (`avatarColor`)
 *
 * A photo set once shows everywhere BECAUSE every surface renders through
 * this one component -- there is no per-site copy to drift. The 30 sites
 * that used to inline the gradient/initial now pass their three source
 * values and their own size classes here.
 *
 * Client component only because of the broken-image fallback (FR-007): an
 * external Google URL can rotate or 404, and an uploaded Blob can be
 * deleted, so a failed <img> load must degrade to the gradient block rather
 * than show a broken image. That needs onError state. A client leaf inside
 * a server parent is fine; this imports no runtime value from a @/db module,
 * so it triggers no "use client" cascade.
 */
export function Avatar({
  avatarImage,
  googleImage,
  avatarColor,
  handle,
  className,
  alt,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = avatarImage || googleImage || null;

  // Show the gradient block when there's no image, or when the image we
  // tried to show failed to load.
  if (!src || failed) {
    return (
      <span
        aria-hidden={false}
        role="img"
        aria-label={alt ?? (handle ? `${handle}'s avatar` : "avatar")}
        style={{ background: gradientFor(avatarColor) }}
        className={`flex items-center justify-center font-bold text-on-accent ${className ?? ""}`}
      >
        {initialOf(handle)}
      </span>
    );
  }

  // A plain <img>, not next/image (research.md #4): avoids allowlisting the
  // Google + Blob hosts in remotePatterns, and preserves the onError
  // fallback to the gradient block that next/image doesn't give us cleanly.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? (handle ? `${handle}'s avatar` : "avatar")}
      onError={() => setFailed(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
