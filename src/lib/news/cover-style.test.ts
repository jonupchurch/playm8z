import { describe, expect, it } from "vitest";
import { newsCoverStyle } from "./cover-style";

const fallback = "linear-gradient(135deg,#ffb000,#ff6b1a)";

describe("newsCoverStyle", () => {
  it("renders a gradient string as-is via `background`", () => {
    expect(newsCoverStyle("linear-gradient(135deg,#ff3b6b,#ffb000)", fallback)).toEqual({
      background: "linear-gradient(135deg,#ff3b6b,#ffb000)",
    });
  });

  it("renders a real image URL via backgroundImage/backgroundSize/backgroundPosition", () => {
    expect(newsCoverStyle("https://example.public.blob.vercel-storage.com/cover.jpg", fallback)).toEqual({
      backgroundImage: "url(https://example.public.blob.vercel-storage.com/cover.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });

  it("falls back to the given gradient when cover is null", () => {
    expect(newsCoverStyle(null, fallback)).toEqual({ background: fallback });
  });
});
