import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { AccountForms } from "@/components/profile/account-forms";
import { PrivacyToggles } from "@/components/profile/privacy-toggles";
import { DangerZone } from "@/components/profile/danger-zone";

export default async function AccountPage() {
  const authUser = await requireAuth();
  const [user] = await db
    .select({
      handle: users.handle,
      name: users.name,
      region: users.region,
      bio: users.bio,
      email: users.email,
      passwordHash: users.passwordHash,
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
      <DangerZone />
    </div>
  );
}
