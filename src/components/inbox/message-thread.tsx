"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/actions/send-message";
import type { ConversationMessage } from "@/lib/inbox/get-conversation";

const POLL_INTERVAL_MS = 5000;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// FR-004: an aria-live region announces new messages; consecutive
// messages from the same sender in a group chat are visually grouped,
// with the sender's name shown once per group, not per message
// (Acceptance Scenario 4, US1). research.md #2: no websocket -- a
// short client-side poll (router.refresh()) keeps an open
// conversation reasonably current while mounted.
export function MessageThread({
  conversationId,
  viewerId,
  isGroup,
  messages,
  isLoggedIn,
}: {
  conversationId: string;
  viewerId: string | null;
  isGroup: boolean;
  messages: ConversationMessage[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router, conversationId]);

  async function handleSend() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await sendMessage({ conversationId, body });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-6"
      >
        {messages.map((message, index) => {
          if (message.type === "system") {
            return (
              <div key={message.id} className="flex justify-center">
                <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] text-text-dim">
                  {message.body}
                </span>
              </div>
            );
          }

          const isMe = message.senderId === viewerId;
          const previous = messages[index - 1];
          const showSender =
            isGroup && !isMe && (!previous || previous.senderId !== message.senderId || previous.type === "system");

          return (
            <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[72%]">
                {showSender && (
                  <div className="mb-0.5 ml-1 font-mono text-[10px] text-accent">
                    @{message.senderHandle ?? "player"}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? "rounded-br-md bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] text-on-accent"
                      : "rounded-bl-md border border-border bg-surface text-text"
                  }`}
                >
                  {message.body}
                </div>
                <div className={`mt-1 font-mono text-[9px] text-text-dim ${isMe ? "text-right" : "text-left"}`}>
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border p-4.5">
        {isLoggedIn ? (
          <div className="flex items-end gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-1.5">
            <label htmlFor="message-composer-body" className="sr-only">
              Write a message
            </label>
            <textarea
              id="message-composer-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Write a message…"
              className="max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm text-text outline-none placeholder:text-text-dim"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={submitting || !body.trim()}
              className="shrink-0 rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              Send
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-4 text-center">
            <Link
              href="/login"
              className="inline-block rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent"
            >
              Log in to message
            </Link>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-pop-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
