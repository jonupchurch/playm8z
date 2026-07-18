import { describe, expect, it } from "vitest";
import { newsCoverStyle } from "./cover-style";

const DEFAULT_IMAGE = {
  backgroundImage: "url(/admin-announcement-header.webp)",
  backgroundSize: "cover",
  backgroundPosition: "left top",
};

describe("newsCoverStyle", () => {
  it("renders a real uploaded image URL, cover-fit and centered", () => {
    expect(newsCoverStyle("https://example.public.blob.vercel-storage.com/cover.jpg")).toEqual({
      backgroundImage: "url(https://example.public.blob.vercel-storage.com/cover.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });

  it("falls back to the default header (anchored top-left) when there is no cover (e.g. patch notes)", () => {
    expect(newsCoverStyle(null)).toEqual(DEFAULT_IMAGE);
  });

  it("falls back to the default header for a legacy gradient cover (not a real image)", () => {
    expect(newsCoverStyle("linear-gradient(135deg,#ff3b6b,#ffb000)")).toEqual(DEFAULT_IMAGE);
  });
});
