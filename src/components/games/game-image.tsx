"use client";

import { useState } from "react";
import { generatedVisual } from "@/lib/games/generated-visual";
import type { ResolvedGameImage } from "@/lib/games/resolve-game-image";

export interface GameImageProps {
  /** The resolved image, computed server-side by resolveGameImage(s). */
  image: ResolvedGameImage;
  /** The game name — needed to regenerate the visual if an admin image 404s. */
  name: string;
  /** Size/radius classes for this call site. */
  className?: string;
}

/**
 * Renders a game's headline image (035): the admin image if curated,
 * otherwise the deterministic generated visual — which is what replaces the
 * flat orange block (FR-005). The resolution decision is made server-side
 * (resolve-game-image.ts, which touches the DB); this component only paints
 * the result, so it stays a pure client leaf and pulls no DB code into the
 * bundle (it imports only the pure `generatedVisual` and a type).
 *
 * If a curated image URL fails to load (an admin's Blob deleted, a bad URL),
 * it falls back to the generated visual rather than a broken image
 * (FR-005 / SC-005) — the same defence the Avatar component uses.
 */
export function GameImage({ image, name, className }: GameImageProps) {
  const [failed, setFailed] = useState(false);

  if (image.kind === "admin" && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt=""
        onError={() => setFailed(true)}
        className={`object-cover ${className ?? ""}`}
      />
    );
  }

  // Generated visual: either the one resolved server-side, or (on img error)
  // one recomputed from the name — deterministic, so it matches.
  const visual = image.kind === "generated" ? image.visual : generatedVisual(name);
  return (
    <div
      aria-hidden="true"
      style={{ background: visual.background }}
      className={`flex items-center justify-center font-bold text-white ${className ?? ""}`}
    >
      {visual.initials}
    </div>
  );
}
