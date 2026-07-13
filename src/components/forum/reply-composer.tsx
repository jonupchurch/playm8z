"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postReply } from "@/lib/actions/post-reply";

export type QuotedReply = { id: string; authorHandle: string; body: string };

// FR-006/FR-007: posts a non-empty reply, optionally carrying a quoted
// reply's id/author/body along with it.
export function ReplyComposer({
  threadId,
  isLoggedIn,
  quoted,
  onCancelQuote,
  onPosted,
}: {
  threadId: string;
  isLoggedIn: boolean;
  quoted: QuotedReply | null;
  onCancelQuote: () => void;
  onPosted: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 p-4.5 text-center">
        <Link
          href="/login"
          className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent"
        >
          Log in to reply
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await postReply({ threadId, body, quotedReplyId: quoted?.id });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setBody("");
    onCancelQuote();
    onPosted();
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
      <div className="mb-3 text-sm font-semibold text-text">Add your reply</div>

      {quoted && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border-l-2 border-accent-2 bg-surface p-2.5">
          <div>
            <div className="mb-0.5 font-mono text-[10px] text-accent-2">Quoting @{quoted.authorHandle}</div>
            <p className="text-xs text-text-dim italic">{quoted.body}</p>
          </div>
          <button
            type="button"
            onClick={onCancelQuote}
            aria-label="Cancel quote"
            className="shrink-0 text-xs text-text-dim"
          >
            ✕
          </button>
        </div>
      )}

      <label htmlFor="reply-composer-body" className="sr-only">
        Reply body
      </label>
      <textarea
        id="reply-composer-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        maxLength={3000}
        placeholder="Share your take… keep it civil."
        className="w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3 text-sm leading-relaxed text-text outline-none"
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-pop-text">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] text-text-dim">Be respectful — read the guidelines.</span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Post reply"}
        </button>
      </div>
    </div>
  );
}
