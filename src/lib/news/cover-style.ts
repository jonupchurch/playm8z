import type { CSSProperties } from "react";

// research.md #4: `newsPosts.cover` holds either one of the 4 gradient
// CSS strings (COVER_SWATCHES, news-post-editor.tsx) or a real
// uploaded image URL (feature 029) -- distinguished by shape alone, no
// `coverType` column. A real URL always starts with "http"; a gradient
// string never does.
export function newsCoverStyle(cover: string | null, fallbackGradient: string): CSSProperties {
  const value = cover ?? fallbackGradient;
  if (value.startsWith("http")) {
    return { backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  return { background: value };
}
