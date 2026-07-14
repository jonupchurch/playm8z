import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getNotifications } from "@/lib/notifications/get-notifications";
import { NotificationsList } from "@/components/notifications/notifications-list";

// FR-001: `/notifications` requires authentication, same reasoning as
// Inbox's own layout -- reading doesn't need the stricter email-
// verification gate (that's a write-action guard); only accepting/
// declining/reporting do.
export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));
  if (!user) {
    redirect("/login");
  }

  const items = await getNotifications(user.id);

  return (
    <main className="min-h-screen bg-bg text-text">
      <NotificationsList items={items} />
    </main>
  );
}
