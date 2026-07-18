import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { AccountForms } from "@/components/profile/account-forms";
import { PrivacyToggles } from "@/components/profile/privacy-toggles";
import { SteamConnectSection } from "@/components/profile/steam-connect-section";
import { DangerZone } from "@/components/profile/danger-zone";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ steam?: string }> }) {
  const authUser = await requireAuth();
  const { steam } = await searchParams;
  const [user] = await db
    .select({
      handle: users.handle,
      name: users.name,
      region: users.region,
      bio: users.bio,
      email: users.email,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
      passwordHash: users.passwordHash,
      steamId: users.steamId,
      privacyShowAge: users.privacyShowAge,
      privacyShowRegion: users.privacyShowRegion,
      privacyShowOnline: users.privacyShowOnline,
      privacyDiscoverable: users.privacyDiscoverable,
    })
    .from(users)
    .where(eq(users.id, authUser.id));

  return (
    <div className="flex max-w-180 flex-col gap-4.5">
      <AccountForms
        handle={user.handle ?? ""}
        name={user.name ?? ""}
        region={user.region ?? "na-east"}
        bio={user.bio ?? ""}
        email={user.email}
        avatarColor={user.avatarColor}
        avatarImage={user.avatarImage}
        image={user.image}
        hasPassword={!!user.passwordHash}
      />
      <PrivacyToggles
        initial={{
          privacyShowAge: user.privacyShowAge,
          privacyShowRegion: user.privacyShowRegion,
          privacyShowOnline: user.privacyShowOnline,
          privacyDiscoverable: user.privacyDiscoverable,
        }}
      />
      <SteamConnectSection connected={!!user.steamId} status={steam} />
      <section className="rounded-2xl border border-border bg-surface-2 p-6">
        <h2 className="mb-1 text-lg font-bold text-text">Blocked users</h2>
        <p className="mb-4 text-[13px] text-text-dim">
          Manage who can&apos;t message you, apply to your parties, or see your content.
        </p>
        <Link
          href="/profile/account/blocked"
          className="inline-block rounded-lg border border-border bg-surface px-4.5 py-2.5 text-sm font-bold text-text"
        >
          Manage blocked users
        </Link>
      </section>
      <DangerZone />
    </div>
  );
}
