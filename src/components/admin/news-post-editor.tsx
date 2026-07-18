"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveNewsPost } from "@/lib/actions/save-news-post";
import { deleteNewsPostPermanently } from "@/lib/actions/delete-news-post";
import { generateNewsDraft } from "@/lib/actions/generate-news-draft";
import { improveDraftText } from "@/lib/actions/improve-draft-text";
import { uploadNewsCoverImage } from "@/lib/actions/upload-news-cover-image";
import { newsCoverStyle } from "@/lib/news/cover-style";
import { NEWS_CATEGORIES, newsCategoryColor, type NewsCategory } from "@/lib/validations/news";
import { statusBadgeClass, statusLabel } from "@/components/admin/news-post-list";
import type { AdminNewsPost } from "@/lib/admin/get-news-posts";

const COVER_SWATCHES = [
  "linear-gradient(135deg,#ffb000,#ff6b1a)",
  "linear-gradient(135deg,#ff6b1a,#ff3b6b)",
  "linear-gradient(135deg,#ff3b6b,#ffb000)",
  "linear-gradient(135deg,#35d0e0,#ff6b1a)",
];

type StatusSeg = "draft" | "published" | "scheduled";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// FR-004/FR-005/FR-006/FR-007/FR-008/FR-009: the editor -- cover
// swatches, title, category chips, excerpt, a markdown-snippet-
// assisted body textarea, tags (News Article detail/023's own bounded
// amendment -- a plain comma-separated input, matching Forum index's
// own tags input exactly), publish settings (status segmented control
// + conditional schedule date + pin toggle), a live preview that
// tracks every field change before saving, and footer actions whose
// label/behavior depend on the post's own loaded status (research.md
// #1, #5) -- never a rich-text editor. Cover also supports a real
// uploaded image (feature 029, Vercel Blob) alongside the 4 gradient
// swatches, distinguished at render time by newsCoverStyle().
// `key={post?.id ?? "new"}`
// on the parent remounts this component (and thus resets all local
// state) whenever a different post is selected.
export function NewsPostEditor({
  post,
  isAdmin,
  isOwner = false,
}: {
  post: AdminNewsPost | null;
  isAdmin: boolean;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [category, setCategory] = useState<NewsCategory>((post?.category as NewsCategory) ?? "Announcement");
  const [cover, setCover] = useState(post?.cover ?? COVER_SWATCHES[0]);
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [statusSeg, setStatusSeg] = useState<StatusSeg>((post?.status as StatusSeg) ?? "draft");
  const [publishDateText, setPublishDateText] = useState(
    post?.status === "scheduled" ? toDateInputValue(post.publishedAt) : "",
  );
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner-only permanent delete (041): a two-step confirm so a single click can
  // never destroy a post.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [aiTopic, setAiTopic] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  async function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || coverUploading) return;

    setCoverUploading(true);
    setCoverUploadError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadNewsCoverImage(formData);

      if (!result.success) {
        setCoverUploadError(result.error);
        return;
      }
      setCover(result.url);
    } catch {
      // A thrown (not returned) failure -- e.g. the request itself
      // being rejected before this action's own body ever runs --
      // must still surface an error and release the pending state,
      // never leave the control stuck on "Uploading…" indefinitely.
      setCoverUploadError("Couldn't upload this image right now. Please try again.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleWriteFromScratch() {
    if (aiPending || !aiTopic.trim()) return;
    setAiPending(true);
    setAiError(null);

    const result = await generateNewsDraft({ topic: aiTopic });

    setAiPending(false);
    if (!result.success) {
      setAiError(result.error);
      return;
    }
    setTitle(result.draft.title);
    setExcerpt(result.draft.excerpt);
    setBody(result.draft.body);
  }

  async function handleImproveBody() {
    if (aiPending || !body.trim()) return;
    setAiPending(true);
    setAiError(null);

    const result = await improveDraftText({ text: body, surface: "news" });

    setAiPending(false);
    if (!result.success) {
      setAiError(result.error);
      return;
    }
    setBody(result.text);
  }

  const isExisting = !!post;
  const wasAlreadyPublished = post?.status === "published";
  const isScheduledSelected = statusSeg === "scheduled";
  const canSave = title.trim().length > 0 && excerpt.trim().length > 0;

  function insertSnippet(before: string, after = "") {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  }

  async function submit(action: "publish" | "schedule" | "save-draft" | "delete") {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await saveNewsPost({
      postId: post?.id,
      title,
      excerpt,
      body,
      category,
      cover,
      featured,
      tags,
      action,
      publishDate: action === "schedule" && publishDateText ? new Date(publishDateText) : undefined,
    });

    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("postId", result.id);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  async function handlePermanentDelete() {
    if (deleting || !post) return;
    setDeleting(true);
    setError(null);

    const result = await deleteNewsPostPermanently({ postId: post.id });
    if (!result.success) {
      setDeleting(false);
      setConfirmingDelete(false);
      setError(result.error);
      return;
    }

    // The post is gone -- drop the selection so the editor returns to a clean
    // new-post state rather than showing a now-nonexistent post.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("postId");
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    router.refresh();
  }

  const primaryLabel = isScheduledSelected ? "Schedule" : isExisting && wasAlreadyPublished ? "Update" : "Publish now";
  const primaryAction: "publish" | "schedule" = isScheduledSelected ? "schedule" : "publish";
  const primaryDisabled = submitting || !canSave || (isScheduledSelected && !publishDateText);

  const previewDate = isScheduledSelected
    ? `Scheduled · ${publishDateText ? formatDisplayDate(new Date(publishDateText)) : "—"}`
    : isExisting && wasAlreadyPublished
      ? formatDisplayDate(post.publishedAt)
      : "Draft";
  const previewColor = newsCategoryColor(category);

  return (
    <div className="overflow-y-auto p-6 pb-16">
      <div className="mb-5 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-wider text-accent-2 uppercase">
          {isExisting ? "Edit post" : "New post"}
        </div>
        {isExisting && post && (
          <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold ${statusBadgeClass(post.status)}`}>
            {statusLabel(post.status)}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-pop-text">
          {error}
        </p>
      )}

      {isAdmin && (
        <div className="mb-5 rounded-2xl border border-border bg-surface-2 p-4.5">
          <div className="mb-2.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">AI writing assist</div>
          <div className="flex items-center gap-2">
            <label htmlFor="ai-topic-news" className="sr-only">
              Topic
            </label>
            <input
              id="ai-topic-news"
              value={aiTopic}
              onChange={(event) => setAiTopic(event.target.value.slice(0, 300))}
              placeholder="A short topic, e.g. 'weekend tournament announcement'…"
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

      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2.5 block text-[13px] font-bold text-text">Cover</label>
            <div className="mb-2.5 h-30 rounded-2xl" style={newsCoverStyle(cover, cover)} />
            <div className="mb-2.5 flex items-center gap-2">
              <label
                htmlFor="news-cover-upload"
                className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-text"
              >
                {coverUploading ? "Uploading…" : "Upload image"}
              </label>
              <input
                id="news-cover-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverFileChange}
                disabled={coverUploading}
                className="sr-only"
              />
            </div>
            {coverUploadError && (
              <p role="alert" className="mb-2.5 text-xs text-pop-text">
                {coverUploadError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-dim">or pick a color:</span>
              {COVER_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use cover color ${swatch}`}
                  aria-pressed={cover === swatch}
                  onClick={() => setCover(swatch)}
                  className={`h-6.5 w-6.5 rounded-lg ${cover === swatch ? "ring-2 ring-[#ffb000] ring-offset-2 ring-offset-surface" : "ring-1 ring-border"}`}
                  style={{ background: swatch }}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="news-title" className="mb-1.5 block text-[13px] font-bold text-text">
              Title
            </label>
            <input
              id="news-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 120))}
              placeholder="Announcement headline…"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-base font-semibold text-text outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-[13px] font-bold text-text">Category</div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {NEWS_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={category === cat}
                  onClick={() => setCategory(cat)}
                  className={
                    category === cat
                      ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                      : "rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-bold text-text"
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
            <label htmlFor="news-excerpt" className="mb-1.5 block text-[13px] font-bold text-text">
              Excerpt
            </label>
            <input
              id="news-excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value.slice(0, 120))}
              maxLength={120}
              placeholder="One-line summary shown in the feed…"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
            />
          </div>

          <div>
            <label htmlFor="news-body" className="mb-1.5 block text-[13px] font-bold text-text">
              Body
            </label>
            <div className="mb-2 flex gap-1">
              <button type="button" onClick={() => insertSnippet("**", "**")} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs font-bold text-text-muted">
                B
              </button>
              <button type="button" onClick={() => insertSnippet("*", "*")} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-muted italic">
                i
              </button>
              <button type="button" onClick={() => insertSnippet("## ")} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-muted">
                H2
              </button>
              <button type="button" onClick={() => insertSnippet("[", "]()")} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-muted">
                🔗
              </button>
              <button type="button" onClick={() => insertSnippet("- ")} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-muted">
                • List
              </button>
              {isAdmin && body.trim().length > 0 && (
                <button
                  type="button"
                  disabled={aiPending}
                  onClick={handleImproveBody}
                  className="ml-auto rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs font-bold text-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiPending ? "Improving…" : "Improve / rewrite"}
                </button>
              )}
            </div>
            <textarea
              id="news-body"
              ref={bodyRef}
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 20000))}
              rows={9}
              placeholder="Write the full announcement…"
              className="w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3.5 text-sm leading-relaxed text-text outline-none"
            />
          </div>

          <div>
            <label htmlFor="news-tags" className="mb-1.5 block text-[13px] font-bold text-text">
              Tags <span className="font-normal text-text-dim">(optional)</span>
            </label>
            <input
              id="news-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="launch, beta, product… (comma separated)"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
            <div className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Publish settings</div>
            <div className="mb-2.5 text-[13px] font-bold text-text">Status</div>
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {(["draft", "published", "scheduled"] as StatusSeg[]).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  aria-pressed={statusSeg === seg}
                  onClick={() => setStatusSeg(seg)}
                  className={
                    statusSeg === seg
                      ? "rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3 py-1.5 font-mono text-[11px] font-bold text-on-accent"
                      : "rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] font-bold text-text"
                  }
                >
                  {statusLabel(seg)}
                </button>
              ))}
            </div>
            {isScheduledSelected && (
              <div className="mb-3.5">
                <label htmlFor="news-publish-date" className="mb-1.5 block text-[13px] font-bold text-text">
                  Publish date
                </label>
                <input
                  id="news-publish-date"
                  type="date"
                  value={publishDateText}
                  onChange={(event) => setPublishDateText(event.target.value)}
                  className="w-55 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
                />
              </div>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={featured}
              onClick={() => setFeatured((current) => !current)}
              className="flex items-center gap-2.5"
            >
              <span
                className={`inline-block h-5.5 w-10 rounded-full transition-colors ${featured ? "bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))]" : "border border-border bg-surface"}`}
              >
                <span
                  className="mt-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: featured ? "translateX(21px)" : "translateX(2px)" }}
                />
              </span>
              <span className="text-[13px] text-text">Pin to top of feed</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={() => submit(primaryAction)}
              className="rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-6 py-3 text-sm font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              disabled={submitting || !canSave}
              onClick={() => submit("save-draft")}
              className="rounded-xl border border-border bg-surface-2 px-5 py-3 text-sm font-semibold text-text disabled:opacity-50"
            >
              Save draft
            </button>
            {isExisting && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting || deleting}
                  onClick={() => submit("delete")}
                  className="rounded-xl border border-border bg-surface-2 px-4.5 py-3 text-[13px] font-semibold text-text-muted disabled:opacity-50"
                >
                  Unpublish
                </button>
                {isOwner &&
                  (confirmingDelete ? (
                    <>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handlePermanentDelete}
                        className="rounded-xl bg-pop px-4.5 py-3 text-[13px] font-bold text-white disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Confirm permanent delete"}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setConfirmingDelete(false)}
                        className="rounded-xl border border-border bg-surface-2 px-4.5 py-3 text-[13px] font-semibold text-text-muted disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="rounded-xl border border-[rgba(255,59,107,0.4)] px-4.5 py-3 text-[13px] font-semibold text-pop-text"
                    >
                      Delete permanently
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky top-6">
          <div className="mb-3 font-mono text-[10px] tracking-wider text-text-dim uppercase">Feed preview</div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
            <div className="relative h-30" style={newsCoverStyle(cover, cover)}>
              {featured && (
                <span className="absolute top-2.5 left-2.5 rounded-md bg-[#ffb000] px-2.5 py-1 font-mono text-[10px] font-bold text-bg">
                  📌 Pinned
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  style={{ color: previewColor, borderColor: `${previewColor}60`, background: `${previewColor}24` }}
                  className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold"
                >
                  {category}
                </span>
                <span className="font-mono text-[10px] text-text-dim">{previewDate}</span>
              </div>
              <div className={`mb-2 text-lg leading-tight font-bold ${title ? "text-text" : "text-text-dim"}`}>
                {title || "Your headline appears here"}
              </div>
              <p className="mb-3.5 text-[13px] leading-relaxed text-text-muted">
                {excerpt || "Add an excerpt to summarize this post for the feed."}
              </p>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ffb000,#ff6b1a)] text-[11px] font-bold text-on-accent">
                  P
                </div>
                <span className="font-mono text-[11px] text-text-muted">playm8z team</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
