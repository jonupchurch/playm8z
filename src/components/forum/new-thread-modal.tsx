"use client";

import { useEffect, useRef, useState } from "react";
import { createThread } from "@/lib/actions/create-thread";
import { CATEGORIES } from "@/lib/forum/categories";
import { useForumUrlParams } from "@/lib/hooks/use-forum-url-params";

// research.md #4: follows the same dialog-accessibility approach
// Blocked Users' block-modal.tsx established (focus trap, native
// showModal()/close(), Escape-to-close, focus restoration) as its own
// component -- different fields, nothing to share by direct reuse.
export function NewThreadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setCategory } = useForumUrlParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [categoryId, setCategoryId] = useState<string>(CATEGORIES[0].key);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Resets fresh each time the dialog transitions to open -- adjusting
  // state during render rather than in an Effect (same pattern
  // block-modal.tsx established, avoiding an extra cascading render).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCategoryId(CATEGORIES[0].key);
      setTitle("");
      setBody("");
      setTags("");
      setError(null);
    }
  }

  function handleDialogClose() {
    onClose();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await createThread({ categoryId: categoryId as never, title, body, tags });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    setCategory(categoryId);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-thread-modal-heading"
      onClose={handleDialogClose}
      className="hidden max-h-[86vh] w-130 max-w-[92vw] flex-col rounded-2xl border border-border bg-surface-2 p-0 text-text open:flex backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
        <h2 id="new-thread-modal-heading" className="text-base font-bold text-text">
          New thread
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <label htmlFor="new-thread-category" className="mb-1.5 block text-[13px] font-bold text-text">
          Category
        </label>
        <select
          id="new-thread-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mb-3.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
        >
          {CATEGORIES.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>

        <label htmlFor="new-thread-title" className="mb-1.5 block text-[13px] font-bold text-text">
          Title
        </label>
        <input
          id="new-thread-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="mb-3.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
        />

        <label htmlFor="new-thread-body" className="mb-1.5 block text-[13px] font-bold text-text">
          Body
        </label>
        <textarea
          id="new-thread-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          rows={5}
          className="mb-3.5 w-full resize-y rounded-lg border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-text outline-none"
        />

        <label htmlFor="new-thread-tags" className="mb-1.5 block text-[13px] font-bold text-text">
          Tags (optional)
        </label>
        <input
          id="new-thread-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="valorant, meta… (comma separated)"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-pop-text">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2.5 border-t border-border p-5">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg border border-border bg-surface px-4.5 py-3 text-sm font-bold text-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="flex-1 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-3 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Post thread"}
        </button>
      </div>
    </dialog>
  );
}
