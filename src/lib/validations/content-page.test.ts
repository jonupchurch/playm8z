import { describe, expect, it } from "vitest";
import { blockSchema, saveContentPageSchema, togglePageStatusSchema } from "./content-page";

describe("blockSchema", () => {
  it("accepts a valid block of each type", () => {
    expect(blockSchema.parse({ type: "h2", text: "Heading" }).type).toBe("h2");
    expect(blockSchema.parse({ type: "p", text: "Paragraph" }).type).toBe("p");
    expect(blockSchema.parse({ type: "list", items: ["one", "two"] }).type).toBe("list");
    expect(blockSchema.parse({ type: "quote", text: "Quote" }).type).toBe("quote");
    expect(blockSchema.parse({ type: "callout", text: "Callout" }).type).toBe("callout");
    expect(blockSchema.parse({ type: "divider" }).type).toBe("divider");
  });

  it("rejects an empty text field", () => {
    expect(() => blockSchema.parse({ type: "p", text: "" })).toThrow();
    expect(() => blockSchema.parse({ type: "h2", text: "   " })).toThrow();
  });

  it("rejects a list with no items", () => {
    expect(() => blockSchema.parse({ type: "list", items: [] })).toThrow();
  });

  it("rejects an unknown block type", () => {
    expect(() => blockSchema.parse({ type: "video", text: "nope" })).toThrow();
  });

  it("rejects a block missing its type's required field", () => {
    expect(() => blockSchema.parse({ type: "p" })).toThrow();
    expect(() => blockSchema.parse({ type: "list" })).toThrow();
  });
});

describe("saveContentPageSchema", () => {
  it("accepts a valid title + slug + blocks array", () => {
    const result = saveContentPageSchema.parse({
      title: "Community Guidelines",
      slug: "community-guidelines",
      blocks: [{ type: "p", text: "Hello" }],
    });
    expect(result.title).toBe("Community Guidelines");
    expect(result.slug).toBe("community-guidelines");
    expect(result.blocks).toHaveLength(1);
  });

  it("accepts an empty blocks array", () => {
    expect(saveContentPageSchema.parse({ title: "Empty page", slug: "empty-page", blocks: [] }).blocks).toEqual([]);
  });

  it("rejects an empty title", () => {
    expect(() => saveContentPageSchema.parse({ title: "", slug: "x", blocks: [] })).toThrow();
  });

  it("normalises a slug's case and surrounding whitespace", () => {
    expect(saveContentPageSchema.parse({ title: "T", slug: "  House-Rules  ", blocks: [] }).slug).toBe("house-rules");
  });

  it.each([["/leading-slash"], ["has spaces"], ["path/separator"], ["trailing-"], ["-leading"], ["double--hyphen"], [""]])(
    "rejects the slug %j",
    (badSlug) => {
      expect(() => saveContentPageSchema.parse({ title: "T", slug: badSlug, blocks: [] })).toThrow();
    },
  );

  // These two carry a valid slug on purpose: without one they'd throw
  // for the missing field rather than the block violation they name, and
  // pass for the wrong reason.
  it("rejects more than 100 blocks", () => {
    const blocks = Array.from({ length: 101 }, () => ({ type: "divider" as const }));
    expect(() => saveContentPageSchema.parse({ title: "Too many blocks", slug: "too-many", blocks })).toThrow();
  });

  it("rejects a malformed block within the array", () => {
    expect(() =>
      saveContentPageSchema.parse({ title: "Bad block", slug: "bad-block", blocks: [{ type: "p", text: "" }] }),
    ).toThrow();
  });
});

describe("togglePageStatusSchema", () => {
  it("accepts published and draft", () => {
    expect(togglePageStatusSchema.parse({ slug: "about", status: "published" }).status).toBe("published");
    expect(togglePageStatusSchema.parse({ slug: "about", status: "draft" }).status).toBe("draft");
  });

  it("rejects an invalid status", () => {
    expect(() => togglePageStatusSchema.parse({ slug: "about", status: "archived" })).toThrow();
  });

  it("rejects an empty slug", () => {
    expect(() => togglePageStatusSchema.parse({ slug: "", status: "draft" })).toThrow();
  });
});
