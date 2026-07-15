"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentBlock } from "@/db/schema";
import { saveContentPage } from "@/lib/actions/save-content-page";
import { togglePageStatus } from "@/lib/actions/toggle-page-status";
import { generateContentPageDraft } from "@/lib/actions/generate-content-page-draft";
import { improveDraftText } from "@/lib/actions/improve-draft-text";
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
  isAdmin,
}: {
  slug: string;
  initialTitle: string;
  initialBlocks: ContentBlock[];
  initialStatus: "published" | "draft";
  updatedAt: string;
  isAdmin: boolean;
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

  const [aiTopic, setAiTopic] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [improvingLocalId, setImprovingLocalId] = useState<string | null>(null);

  function makeLocalId(): string {
    nextLocalId.current += 1;
    return `b${nextLocalId.current}`;
  }

  async function handleWriteFromScratch() {
    if (aiPending || !aiTopic.trim()) return;
    setAiPending(true);
    setAiError(null);

    const result = await generateContentPageDraft({ topic: aiTopic });

    setAiPending(false);
    if (!result.success) {
      setAiError(result.error);
      return;
    }
    setDraftBlocks(result.draft.blocks.map((block) => ({ localId: makeLocalId(), block })));
    setSaved(false);
  }

  async function handleImproveBlock(localId: string) {
    if (aiPending) return;
    const entry = draftBlocks.find((candidate) => candidate.localId === localId);
    if (!entry) return;
    const text = blockToText(entry.block);
    if (!text.trim()) return;

    setAiPending(true);
    setImprovingLocalId(localId);
    setAiError(null);

    const result = await improveDraftText({ text, surface: "contentPage" });

    setAiPending(false);
    setImprovingLocalId(null);
    if (!result.success) {
      setAiError(result.error);
      return;
    }
    updateBlock(localId, result.text);
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

          {isAdmin && (
            <div className="mb-8 rounded-2xl border border-border bg-surface-2 p-4.5">
              <div className="mb-2.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">AI writing assist</div>
              <div className="flex items-center gap-2">
                <label htmlFor="ai-topic-content-page" className="sr-only">
                  Topic
                </label>
                <input
                  id="ai-topic-content-page"
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value.slice(0, 300))}
                  placeholder="A short topic, e.g. 'community guidelines'…"
                  className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
                />
                <button
                  type="button"
                  disabled={aiPending || !aiTopic.trim()}
                  onClick={handleWriteFromScratch}
                  className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2.5 text-[13px] font-bold text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiPending ? "Writing…" : "Write from scratch"}
                </button>
              </div>
              {aiError && (
                <p role="alert" className="mt-2 text-xs text-pop-text">
                  {aiError}
                </p>
              )}
            </div>
          )}

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
                isAdmin={isAdmin}
                aiPending={aiPending}
                isImproving={improvingLocalId === entry.localId}
                onImprove={() => handleImproveBlock(entry.localId)}
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
  isAdmin,
  aiPending,
  isImproving,
  onImprove,
}: {
  entry: DraftBlock;
  index: number;
  total: number;
  onChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  aiPending: boolean;
  isImproving: boolean;
  onImprove: () => void;
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
        {isAdmin && !isDivider && blockToText(entry.block).trim().length > 0 && (
          <button
            type="button"
            disabled={aiPending}
            onClick={onImprove}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-bold text-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImproving ? "Improving…" : "Improve / rewrite"}
          </button>
        )}
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
