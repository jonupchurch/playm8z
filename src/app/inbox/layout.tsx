import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getInboxList } from "@/lib/inbox/get-inbox-list";
import { ConversationList } from "@/components/inbox/conversation-list";

// FR-001: `/inbox` requires authentication -- an unauthenticated
// visitor is routed to log in. Reading doesn't need Auth & Onboarding's
// stricter email-verification gate (that's a write-action guard); only
// sending/starting/accepting/declining do.
export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));
  if (!user) {
    redirect("/login");
  }

  const items = await getInboxList(user.id);

  return (
    // Notifications + Report modal (012) added a global sticky header
    // (h-14) above every page -- subtracted here so this two-pane
    // layout still fills exactly the remaining viewport instead of
    // overflowing it by the header's own height.
    <main className="h-[calc(100vh-3.5rem)] bg-bg text-text">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <ConversationList items={items} />
        <div className="flex min-h-0 flex-col">{children}</div>
      </div>
    </main>
  );
}
