import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import { ProfileTabs } from "@/components/profile/profile-tabs";

// FR-015: every /profile page requires authentication -- this is the
// signed-in user's own account, not a public view (Public Profile,
// not yet spec'd, covers viewing someone else's).
export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [user] = await db
    .select({
      handle: users.handle,
      name: users.name,
      avatarColor: users.avatarColor,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) {
    redirect("/login");
  }

  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === user.avatarColor)?.gradient ?? AVATAR_COLORS[0].gradient;
  const initial = (user.handle?.trim()[0] || "P").toUpperCase();

  return (
    <main className="grow bg-bg text-text">
      <div
        className="border-b border-border"
        style={{
          backgroundImage: "radial-gradient(circle at 20% -60%, rgba(255,107,26,0.12), transparent 55%)",
        }}
      >
        <div className="mx-auto max-w-270 px-8 pt-8">
          <div className="flex flex-wrap items-start gap-5.5">
            <div
              style={{ background: avatarGradient }}
              className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl text-4xl font-bold text-on-accent"
            >
              {initial}
            </div>
            <div className="min-w-65 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[28px] font-bold tracking-tight">{user.name ?? `@${user.handle}`}</h1>
                <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[11px] font-bold text-success">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"
                  />
                  Online
                </span>
              </div>
              <div className="mt-1 font-mono text-xs text-text-muted">
                @{user.handle} · joined {user.createdAt.getFullYear()}
              </div>
              {user.bio && <p className="mt-3 max-w-140 text-sm leading-relaxed text-text-muted">{user.bio}</p>}
            </div>
            <Link
              href="/profile/account"
              className="rounded-lg border border-border bg-surface-2 px-4.5 py-2.5 text-sm font-bold text-text"
            >
              Edit profile
            </Link>
          </div>

          <ProfileTabs />
        </div>
      </div>

      <div className="mx-auto max-w-270 px-8 py-7">{children}</div>
    </main>
  );
}
