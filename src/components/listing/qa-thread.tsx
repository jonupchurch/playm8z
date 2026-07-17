"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { askQuestion } from "@/lib/actions/ask-question";
import { replyToQuestion } from "@/lib/actions/reply-to-question";
import { relativeAge } from "@/components/listings/listing-card";
import { Avatar } from "@/components/ui/avatar";
import { ReportModal, type ReportTarget } from "@/components/reports/report-modal";

export type ThreadQuestion = {
  id: string;
  askerId: string;
  askerHandle: string | null;
  askerAvatarColor: string | null;
  askerAvatarImage: string | null;
  askerImage: string | null;
  text: string;
  reply: string | null;
  createdAt: Date;
};

function QuestionRow({
  question,
  isHost,
  isLoggedIn,
}: {
  question: ThreadQuestion;
  isHost: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // FR-010 (006-listing-detail's amended, previously-deferred Report
  // action): per-question reports target the asker directly
  // (targetType='user') -- reportTargetTypeEnum has no dedicated
  // "question" variant (data-model.md), so blockUserId is just the
  // same id being reported.
  const reportTarget: ReportTarget = {
    targetType: "user",
    targetId: question.askerId,
    label: `Question by @${question.askerHandle ?? "player"}`,
    blockUserId: question.askerId,
  };

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await replyToQuestion(question.id, { reply: replyText });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2.5">
      <Avatar
        avatarImage={question.askerAvatarImage}
        googleImage={question.askerImage}
        avatarColor={question.askerAvatarColor}
        handle={question.askerHandle}
        className="h-8.5 w-8.5 shrink-0 rounded-lg text-sm"
      />
      <div className="flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[13px] font-bold text-text">@{question.askerHandle ?? "player"}</span>
          <span className="font-mono text-[10px] text-text-dim">{relativeAge(question.createdAt)}</span>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-text-dim"
            >
              ⚑ Report
            </button>
          )}
        </div>
        <p className="text-sm leading-relaxed text-text-muted">{question.text}</p>

        {question.reply && (
          <div className="mt-2.5 rounded-r-lg border-l-2 border-accent-2 bg-surface px-3 py-2.5">
            <div className="mb-0.5 font-mono text-[10px] text-accent-2">Host replied</div>
            <p className="text-[13px] leading-relaxed text-text-muted">{question.reply}</p>
          </div>
        )}

        {isHost && !question.reply && (
          <form onSubmit={handleReply} className="mt-2.5">
            <label htmlFor={`reply-${question.id}`} className="sr-only">
              Reply to this question
            </label>
            <textarea
              id={`reply-${question.id}`}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={2}
              placeholder="Write a reply…"
              className="mb-2 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            />
            {error && (
              <p role="alert" className="mb-2 text-xs text-pop-text">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || replyText.trim().length === 0}
              className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-3.5 py-1.5 text-xs font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Replying…" : "Reply"}
            </button>
          </form>
        )}
      </div>

      <ReportModal open={reportOpen} target={reportTarget} onClose={() => setReportOpen(false)} />
    </div>
  );
}

// FR-010/FR-011: any verified visitor can ask; only the listing's host
// can reply, and only on their own listing (reply-to-question.ts's
// server-side ownership check -- this component just doesn't render a
// reply control for non-hosts, a UX nicety, not the real guard).
export function QaThread({
  postingId,
  questions,
  isHost,
  isLoggedIn,
}: {
  postingId: string;
  questions: ThreadQuestion[];
  isHost: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    const result = await askQuestion(postingId, { text });
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setText("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
        Questions for the host · {questions.length}
      </h2>

      <div className="mb-4.5 flex flex-col gap-4">
        {questions.map((question) => (
          <QuestionRow key={question.id} question={question} isHost={isHost} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {isLoggedIn ? (
        <form onSubmit={handleAsk} className="flex items-center gap-2.5 rounded-lg border border-border bg-bg p-1.5 pl-3.5">
          <label htmlFor="ask-question" className="sr-only">
            Ask a question
          </label>
          <input
            id="ask-question"
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 300))}
            maxLength={300}
            placeholder="Ask a question…"
            className="flex-1 bg-transparent py-2 text-sm text-text outline-none"
          />
          <button
            type="submit"
            disabled={submitting || text.trim().length === 0}
            className="shrink-0 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            Ask
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="block rounded-lg border border-border bg-bg py-2.5 text-center text-sm font-bold text-text-muted"
        >
          Log in to ask a question
        </Link>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-pop-text">
          {error}
        </p>
      )}
    </section>
  );
}
