import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getConversationOrRequest, markConversationRead } from "@/lib/inbox/get-conversation";
import { MessageThread } from "@/components/inbox/message-thread";
import { RequestBanner } from "@/components/inbox/request-banner";

// FR-004/FR-007: `[conversationId]` addresses either a real
// conversation or a still-pending request (same id space, research.md
// #1) -- viewing a real conversation marks it read as a side effect
// (Acceptance Scenario 3, US1), the same "read triggers a write"
// pattern as Forum Thread's incrementViewCount.
export default async function InboxConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  const session = await auth();
  const isLoggedIn = !!session?.user?.email;

  let viewerId: string | null = null;
  if (isLoggedIn) {
    const [viewer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session!.user!.email!));
    viewerId = viewer?.id ?? null;
  }

  if (!viewerId) {
    notFound();
  }

  const view = await getConversationOrRequest(conversationId, viewerId);
  if (!view) {
    notFound();
  }

  if (view.kind === "request") {
    return (
      <>
        <div className="shrink-0 border-b border-border p-4.5">
          <div className="text-base font-bold text-text">@{view.applicantHandle}</div>
          <div className="font-mono text-[11px] text-text-dim">
            re: {view.postingGame} · {view.postingTitle}
          </div>
        </div>
        <RequestBanner
          applicationId={view.applicationId}
          applicantHandle={view.applicantHandle}
          context={`${view.postingGame} · ${view.postingTitle}`}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[72%]">
            <div className="mb-0.5 ml-1 font-mono text-[10px] text-accent">@{view.applicantHandle}</div>
            <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-text">
              {view.message ?? "Wants to join your party."}
            </div>
          </div>
        </div>
      </>
    );
  }

  await markConversationRead(view.id, viewerId);

  return (
    <>
      <div className="shrink-0 border-b border-border p-4.5">
        <div className="text-base font-bold text-text">{view.name}</div>
        <div className="font-mono text-[11px] text-text-dim">{view.context}</div>
      </div>
      <MessageThread
        conversationId={view.id}
        viewerId={viewerId}
        isGroup={view.isGroup}
        messages={view.messages}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
