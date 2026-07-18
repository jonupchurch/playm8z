import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { getSettings } from "@/lib/settings/get-settings";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // 031: the suggested games are admin-editable, so they're read here and
  // passed down. The wizard is a client component -- importing a runtime
  // value from a module that reaches @/db would crash the page.
  const { suggestedGames } = await getSettings();

  const [user] = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      avatarColor: users.avatarColor,
      region: users.region,
      platforms: users.platforms,
      ageGroup: users.ageGroup,
      vibe: users.vibe,
      playTimeSlots: users.playTimeSlots,
    })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) redirect("/login");

  // 042 (ADR 0015): prefill games from userGames (the single source of truth),
  // not the deprecated users.gamesPlayed column.
  const games = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, user.id));

  return (
    <OnboardingWizard
      needsHandle={!user.handle}
      suggestedGames={suggestedGames}
      initialProfile={{
        name: user.name ?? "",
        avatarColor: user.avatarColor ?? "amber-orange",
        gamesPlayed: games.map((row) => row.game),
        region: user.region ?? "",
        platforms: user.platforms ?? [],
        ageGroup: user.ageGroup ?? "",
        vibe: user.vibe ?? "",
        playTimeSlots: user.playTimeSlots ?? [],
      }}
    />
  );
}
