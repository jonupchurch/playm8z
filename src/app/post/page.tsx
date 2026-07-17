import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getGameSuggestions } from "@/lib/postings/get-game-suggestions";
import { getSettings } from "@/lib/settings/get-settings";
import { PostGameForm } from "@/components/post-game/post-game-form";

// FR-016: a logged-out visitor is routed to log in before reaching this
// page. Email verification (FR-017) is NOT checked here -- an
// unverified user can still fill out and preview the form, only
// Publish itself is blocked (create-posting.ts), matching US2's own
// acceptance scenario.
export default async function PostGamePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [[user], gameSuggestions, { genres }] = await Promise.all([
    db
      .select({
        handle: users.handle,
        avatarColor: users.avatarColor,
        avatarImage: users.avatarImage,
        image: users.image,
      })
      .from(users)
      .where(eq(users.email, session.user.email)),
    getGameSuggestions(),
    getSettings(),
  ]);

  return (
    <main className="grow bg-bg text-text">
      <div className="mx-auto max-w-330 px-8 pt-8 pb-16">
        <div className="mb-6.5">
          <h1 className="mb-1 text-3xl font-bold tracking-tight">Post a game</h1>
          <p className="text-sm text-text-muted">
            Tell players what you&apos;re running and who you&apos;re looking for. It goes live
            the moment you publish.
          </p>
        </div>

        <PostGameForm
          hostHandle={user?.handle ?? "player"}
          hostAvatarColor={user?.avatarColor ?? null}
          hostAvatarImage={user?.avatarImage ?? null}
          hostImage={user?.image ?? null}
          gameSuggestions={gameSuggestions}
          genres={genres}
        />
      </div>
    </main>
  );
}
