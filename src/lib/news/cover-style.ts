import type { CSSProperties } from "react";

// A news post's cover is either a real uploaded image URL (feature 029, which always
// starts with "http") or -- historically -- one of the gradient CSS swatches / nothing
// at all. Any post WITHOUT a real uploaded image now falls back to the default header
// image, so every news item (patch notes included) shows a proper header "by default
// unless another image is provided."
const DEFAULT_COVER = "/admin-announcement-header.png";

export function newsCoverStyle(cover: string | null): CSSProperties {
  const url = cover && cover.startsWith("http") ? cover : DEFAULT_COVER;
  return { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" };
}
