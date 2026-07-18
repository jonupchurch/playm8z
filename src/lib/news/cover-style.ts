import type { CSSProperties } from "react";

// A news post's cover is either a real uploaded image URL (feature 029, which always
// starts with "http") or -- historically -- one of the gradient CSS swatches / nothing
// at all. Any post WITHOUT a real uploaded image falls back to the default header image,
// so every news item (patch notes included) shows a proper header "by default unless
// another image is provided."
const DEFAULT_COVER = "/admin-announcement-header.webp";

export function newsCoverStyle(cover: string | null): CSSProperties {
  if (cover && cover.startsWith("http")) {
    // A real uploaded image: cover-fit, centered (the usual crop for a photo).
    return { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  // Default header: its logo + title live in the upper-left, so anchor there -- on short/
  // narrow cards `cover` then crops the overflow off the right/bottom instead of slicing
  // into the title.
  return { backgroundImage: `url(${DEFAULT_COVER})`, backgroundSize: "cover", backgroundPosition: "left top" };
}
