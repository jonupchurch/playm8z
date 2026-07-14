import type { ContentBlock } from "@/db/schema";

// FR-002: view-mode rendering for all six block types. Used both
// directly (a non-moderator visitor's whole page) and by
// `page-editor.tsx` when a moderator viewer isn't currently editing.
export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-6.5 mb-3 text-[22px] font-bold tracking-tight text-text">{block.text}</h2>;
    case "p":
      return <p className="mb-1 text-base leading-[1.75] text-text-muted">{block.text}</p>;
    case "list":
      return (
        <ul className="my-2 flex list-none flex-col gap-2.5 pl-1">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-2.5 text-base leading-relaxed text-text-muted">
              <span aria-hidden="true" className="flex-none font-bold text-accent">
                ›
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="my-2 border-l-2 border-accent py-1 pl-4.5 text-[17px] leading-relaxed text-text italic">
          {block.text}
        </blockquote>
      );
    case "callout":
      return (
        <div className="my-2.5 flex gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4.5 py-4">
          <span aria-hidden="true" className="flex-none text-lg">
            💡
          </span>
          <p className="m-0 text-[15px] leading-relaxed text-text-muted">{block.text}</p>
        </div>
      );
    case "divider":
      return <hr className="my-5.5 border-border" />;
  }
}
