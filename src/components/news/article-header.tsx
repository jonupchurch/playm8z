"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleNewsLike } from "@/lib/actions/toggle-news-like";
import { toggleSavedNewsPost } from "@/lib/actions/toggle-saved-news-post";
import { newsCategoryColor } from "@/lib/validations/news";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function copyLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}

// FR-001/FR-005/FR-009: category/date/read-time meta, title, the
// fixed "playm8z team" byline (the wireframe's own -- no per-article
// author tracking exists anywhere, matching Admin News' own editor
// preview), and Like/Save/Share. Logged-out visitors see Like/Save as
// real `/login` links (apply-panel.tsx's own precedent) rather than
// interactive buttons; the unverified-email case is handled entirely
// by each Server Action's own friendly error message, shown inline.
export function ArticleHeader({
  newsPostId,
  title,
  category,
  publishedAt,
  readTimeMinutes,
  isLoggedIn,
  initialLikeCount,
  initialLiked,
  initialSaved,
}: {
  newsPostId: string;
  title: string;
  category: string;
  publishedAt: Date;
  readTimeMinutes: number;
  isLoggedIn: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialSaved: boolean;
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [likePending, setLikePending] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const color = newsCategoryColor(category);

  async function handleToggleLike() {
    setLikePending(true);
    setLikeError(null);
    const result = await toggleNewsLike({ newsPostId });
    setLikePending(false);
    if (!result.success) {
      setLikeError(result.error);
      return;
    }
    setLiked(result.liked);
    setLikeCount((count) => count + (result.liked ? 1 : -1));
  }

  async function handleToggleSave() {
    setSavePending(true);
    setSaveError(null);
    const result = await toggleSavedNewsPost({ newsPostId });
    setSavePending(false);
    if (!result.success) {
      setSaveError(result.error);
      return;
    }
    setSaved(result.saved);
  }

  async function handleShare() {
    if (await copyLink()) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  return (
    <div className="mx-auto max-w-190 px-8 pt-6 pb-0">
      <Link href="/news" className="mb-5.5 inline-block font-mono text-xs text-text-muted">
        ← Back to News
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          style={{ color, borderColor: `${color}66`, background: `${color}21` }}
          className="rounded-full border px-3 py-1 font-mono text-[11px] font-bold"
        >
          {category}
        </span>
        <span className="font-mono text-[11px] text-text-dim">
          {formatDate(publishedAt)} · {readTimeMinutes} min read
        </span>
      </div>

      <h1 className="mb-5 text-[34px] leading-[1.1] font-bold tracking-tight text-text sm:text-[42px]">{title}</h1>

      <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-border pb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#ffb000,#ff6b1a)] text-[15px] font-bold text-on-accent">
          P
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-text">playm8z team</div>
          <div className="font-mono text-[10px] text-text-dim">{category}</div>
        </div>

        {isLoggedIn ? (
          <>
            <button
              type="button"
              disabled={likePending}
              onClick={handleToggleLike}
              aria-pressed={liked}
              className={
                liked
                  ? "flex items-center gap-1.5 rounded-lg bg-pop px-3.5 py-2 font-mono text-xs font-bold text-white disabled:opacity-60"
                  : "flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text-muted disabled:opacity-60"
              }
            >
              ♥ {likeCount}
            </button>
            <button
              type="button"
              disabled={savePending}
              onClick={handleToggleSave}
              aria-pressed={saved}
              className={
                saved
                  ? "rounded-lg border border-[rgba(78,201,106,0.4)] bg-[rgba(78,201,106,0.12)] px-3.5 py-2 font-mono text-xs font-bold text-[#8fe0a3] disabled:opacity-60"
                  : "rounded-lg border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text-muted disabled:opacity-60"
              }
            >
              {saved ? "Saved" : "Save"}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text-muted">
              ♥ {likeCount}
            </Link>
            <Link href="/login" className="rounded-lg border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text-muted">
              Save
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={handleShare}
          aria-label={shareCopied ? "Link copied" : "Copy article link"}
          className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-sm text-text-muted"
        >
          {shareCopied ? "✓" : "↗"}
        </button>
      </div>

      {(likeError || saveError) && (
        <p role="alert" className="mb-2 text-xs text-pop-text">
          {likeError || saveError}
        </p>
      )}
    </div>
  );
}

// The bottom tags + explicit share row (X/LinkedIn/copy-link), FR-009
// -- plain client-side share-intent links / a clipboard copy, no
// backend call. Colocated with ArticleHeader since both are the same
// small, stateful "share this article" concern (plan.md scopes this
// file as owning the header's whole Like/Save/Share surface).
export function ArticleTagsShare({ tags }: { tags: string[] }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await copyLink()) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // FR-009: `window.location`/`document.title` are only ever read
  // inside a click handler, never rendered into an `href` at render
  // time -- reading them during render (server AND client both
  // execute this component's render) produced a real hydration
  // mismatch (server has no `window`, so the href it emits is
  // empty/wrong, then the client "corrects" it after mount). A plain
  // button + `window.open()` sidesteps this entirely, matching
  // copyLink()'s own click-time-only pattern.
  function handleShareX() {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(document.title)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-8.5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-text-muted">
            #{tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-text-dim">Share:</span>
        <button
          type="button"
          onClick={handleShareX}
          aria-label="Share on X"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-[9px] border border-border bg-surface-2 text-xs text-text-muted"
        >
          𝕏
        </button>
        <button
          type="button"
          onClick={handleShareLinkedIn}
          aria-label="Share on LinkedIn"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-[9px] border border-border bg-surface-2 text-xs text-text-muted"
        >
          in
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Link copied" : "Copy link"}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-[9px] border border-border bg-surface-2 text-xs text-text-muted"
        >
          {copied ? "✓" : "🔗"}
        </button>
      </div>
    </div>
  );
}
