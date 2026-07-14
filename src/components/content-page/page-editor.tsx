"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentBlock } from "@/db/schema";
import { saveContentPage } from "@/lib/actions/save-content-page";
import { togglePageStatus } from "@/lib/actions/toggle-page-status";
import { BlockRenderer } from "./block-renderer";

type DraftBlock = { localId: string; block: ContentBlock };

const BLOCK_TYPE_LABEL: Record<ContentBlock["type"], string> = {
  h2: "Heading",
  p: "Paragraph",
  list: "List",
  quote: "Quote",
  callout: "Callout",
  divider: "Divider",
};

const ADD_BUTTONS: { type: ContentBlock["type"]; label: string }[] = [
  { type: "h2", label: "Heading" },
  { type: "p", label: "Paragraph" },
  { type: "list", label: "List" },
  { type: "quote", label: "Quote" },
  { type: "callout", label: "Callout" },
  { type: "divider", label: "Divider" },
];

function defaultBlockFor(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "h2":
      return { type: "h2", text: "New heading" };
    case "p":
      return { type: "p", text: "New paragraph text." };
    case "list":
      return { type: "list", items: ["New list item"] };
    case "quote":
      return { type: "quote", text: "New quote" };
    case "callout":
      return { type: "callout", text: "New callout note" };
    case "divider":
      return { type: "divider" };
  }
}

function blockToText(block: ContentBlock): string {
  if (block.type === "list") return block.items.join("\n");
  if (block.type === "divider") return "";
  return block.text;
}

function withText(block: ContentBlock, value: string): ContentBlock {
  if (block.type === "list") return { ...block, items: value.split("\n") };
  if (block.type === "divider") return block;
  return { ...block, text: value };
}

// FR-005/FR-006/FR-007, research.md #3: every add/remove/reorder/edit
// interaction mutates local draft state only. "Save changes" is the
// one moment `saveContentPage` is called, with the whole resulting
// title+blocks array; "Cancel" just discards the draft, since the
// last-saved title/blocks are kept separately and never touched by
// in-progress edits.
export function PageEditor({
  slug,
  initialTitle,
  initialBlocks,
  initialStatus,
  updatedAt,
}: {
  slug: string;
  initialTitle: string;
  initialBlocks: ContentBlock[];
  initialStatus: "published" | "draft";
  updatedAt: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const nextLocalId = useRef(0);

  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedBlocks, setSavedBlocks] = useState(initialBlocks);
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([]);

  function makeLocalId(): string {
    nextLocalId.current += 1;
    return `b${nextLocalId.current}`;
  }

  function startEdit() {
    setDraftTitle(savedTitle);
    setDraftBlocks(savedBlocks.map((block) => ({ localId: makeLocalId(), block })));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function updateBlock(localId: string, value: string) {
    setDraftBlocks((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, block: withText(entry.block, value) } : entry)),
    );
    setSaved(false);
  }

  function moveBlock(localId: string, direction: -1 | 1) {
    setDraftBlocks((current) => {
      const index = current.findIndex((entry) => entry.localId === localId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = current.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function deleteBlock(localId: string) {
    setDraftBlocks((current) => current.filter((entry) => entry.localId !== localId));
    setSaved(false);
  }

  function addBlock(type: ContentBlock["type"]) {
    setDraftBlocks((current) => [...current, { localId: makeLocalId(), block: defaultBlockFor(type) }]);
    setSaved(false);
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const blocks = draftBlocks.map((entry) => {
      const block = entry.block;
      if (block.type === "list") {
        return { ...block, items: block.items.map((item) => item.trim()).filter((item) => item.length > 0) };
      }
      return block;
    });
    const result = await saveContentPage(slug, { title: draftTitle, blocks });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSavedTitle(draftTitle);
    setSavedBlocks(blocks);
    setEditing(false);
    setSaved(true);
    router.refresh();
  }

  async function handleTogglePublish() {
    setSubmitting(true);
    setError(null);
    const nextStatus = status === "published" ? "draft" : "published";
    const result = await togglePageStatus({ slug, status: nextStatus });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus(nextStatus);
    router.refresh();
  }

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-8 mb-8 flex flex-wrap items-center gap-3.5 border-b border-accent/30 bg-accent/10 px-8 py-2.5 backdrop-blur">
        <span className="font-mono text-[11px] font-bold text-accent">MODERATOR</span>
        <span
          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
            status === "published"
              ? "border border-success/40 bg-success/10 text-success"
              : "border border-border bg-surface text-text-muted"
          }`}
        >
          {status === "published" ? "Published" : "Draft"}
        </span>
        {error && (
          <span role="alert" className="font-mono text-[11px] text-pop-text">
            {error}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleTogglePublish}
                disabled={submitting}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-text disabled:opacity-60"
              >
                {status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={submitting}
                className="rounded-lg border border-border bg-transparent px-3.5 py-2 text-[13px] font-semibold text-text-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="rounded-lg bg-accent px-4.5 py-2 text-[13px] font-bold text-on-accent disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              {saved && <span className="font-mono text-[11px] font-bold text-success">✓ Saved</span>}
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg bg-accent px-4.5 py-2 text-[13px] font-bold text-on-accent"
              >
                ✎ Edit page
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div>
          <label htmlFor={titleId} className="mb-1.5 block text-[13px] font-bold text-text">
            Page title
          </label>
          <input
            id={titleId}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="mb-8 w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-[28px] font-bold tracking-tight text-text outline-none"
          />

          <div className="flex flex-col gap-3.5">
            {draftBlocks.map((entry, index) => (
              <BlockEditRow
                key={entry.localId}
                entry={entry}
                index={index}
                total={draftBlocks.length}
                onChange={(value) => updateBlock(entry.localId, value)}
                onMoveUp={() => moveBlock(entry.localId, -1)}
                onMoveDown={() => moveBlock(entry.localId, 1)}
                onDelete={() => deleteBlock(entry.localId)}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-5">
            <span className="mr-1 font-mono text-[10px] text-text-dim">Add block:</span>
            {ADD_BUTTONS.map((button) => (
              <button
                key={button.type}
                type="button"
                onClick={() => addBlock(button.type)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] font-bold text-text"
              >
                + {button.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <h1 className="mb-3 text-4xl leading-tight font-bold tracking-tight text-text">{savedTitle}</h1>
          <p className="mb-9 font-mono text-xs text-text-dim">
            Last updated {new Date(updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <BlockRenderer blocks={savedBlocks} />
        </>
      )}
    </div>
  );
}

function BlockEditRow({
  entry,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  entry: DraftBlock;
  index: number;
  total: number;
  onChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const fieldId = `content-block-${entry.localId}`;
  const typeLabel = BLOCK_TYPE_LABEL[entry.block.type];
  const isDivider = entry.block.type === "divider";

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <label
          htmlFor={isDivider ? undefined : fieldId}
          className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-accent uppercase"
        >
          {typeLabel}
        </label>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move ${typeLabel.toLowerCase()} block up`}
            className="h-6.5 w-6.5 rounded-md border border-border bg-surface text-xs text-text-muted disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Move ${typeLabel.toLowerCase()} block down`}
            className="h-6.5 w-6.5 rounded-md border border-border bg-surface text-xs text-text-muted disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${typeLabel.toLowerCase()} block`}
            className="h-6.5 w-6.5 rounded-md border border-pop/35 bg-transparent text-xs text-pop-text"
          >
            ✕
          </button>
        </div>
      </div>
      {isDivider ? (
        <hr className="border-border" />
      ) : (
        <textarea
          id={fieldId}
          value={blockToText(entry.block)}
          onChange={(event) => onChange(event.target.value)}
          rows={entry.block.type === "list" ? Math.max(3, entry.block.items.length) : entry.block.type === "h2" ? 1 : 3}
          placeholder={entry.block.type === "list" ? "One item per line…" : "Type here…"}
          className="w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-text outline-none"
        />
      )}
    </div>
  );
}
