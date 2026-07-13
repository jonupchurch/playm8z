import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const [user] = await db
    .select({
      handle: users.handle,
      name: users.name,
      avatarColor: users.avatarColor,
      gamesPlayed: users.gamesPlayed,
      region: users.region,
      platforms: users.platforms,
      ageGroup: users.ageGroup,
      vibe: users.vibe,
      playTimeSlots: users.playTimeSlots,
    })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) redirect("/login");

  return (
    <OnboardingWizard
      needsHandle={!user.handle}
      initialProfile={{
        name: user.name ?? "",
        avatarColor: user.avatarColor ?? "amber-orange",
        gamesPlayed: user.gamesPlayed ?? [],
        region: user.region ?? "",
        platforms: user.platforms ?? [],
        ageGroup: user.ageGroup ?? "",
        vibe: user.vibe ?? "",
        playTimeSlots: user.playTimeSlots ?? [],
      }}
    />
  );
}
