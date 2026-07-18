import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userGames, users } from "@/db/schema";
import { syncOnboardingGames } from "@/lib/games/sync-onboarding-games";
import { onboardingPatchSchema } from "@/lib/validations/onboarding";

// Never include passwordHash -- this response is echoed straight to the
// client for the completion-screen summary.
const profileColumns = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarColor: users.avatarColor,
  region: users.region,
  platforms: users.platforms,
  ageGroup: users.ageGroup,
  vibe: users.vibe,
  playTimeSlots: users.playTimeSlots,
  // 042: games are NOT read from the deprecated users.gamesPlayed column any
  // more -- the response's `gamesPlayed` is derived from userGames below.
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingPatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid input.", field: issue?.path[0] },
      { status: 400 },
    );
  }

  const patch = parsed.data;
  const userEmail = session.user.email;

  if (patch.handle) {
    const [self] = await db
      .select({ handle: users.handle })
      .from(users)
      .where(eq(users.email, userEmail));

    if (self?.handle) {
      // Immutable once set (FR-003) -- ignore a resubmitted/changed value
      // rather than erroring, since the client only sends it when it
      // thought no handle existed yet.
      delete patch.handle;
    } else {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.handle, patch.handle));
      if (taken) {
        return NextResponse.json(
          { error: "That handle is already taken.", field: "handle" },
          { status: 409 },
        );
      }
    }
  }

  // 042 (ADR 0015): games go to userGames (the single source of truth), never the
  // deprecated users.gamesPlayed column. Pull the games out of the patch and
  // reconcile them separately so the players's profile + matching actually
  // reflect their onboarding picks.
  const gamesInput = patch.gamesPlayed;
  delete patch.gamesPlayed;

  const [me] = await db.select({ id: users.id }).from(users).where(eq(users.email, userEmail));
  if (!me) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (gamesInput !== undefined) {
    await syncOnboardingGames(me.id, gamesInput);
  }

  const updated =
    Object.keys(patch).length > 0
      ? (
          await db
            .update(users)
            .set(patch)
            .where(eq(users.email, userEmail))
            .returning(profileColumns)
        )[0]
      : (await db.select(profileColumns).from(users).where(eq(users.email, userEmail)))[0];

  // The completion summary is client-state-driven, but keep the response truthful:
  // report games from userGames, not the retired column.
  const games = await db.select({ game: userGames.game }).from(userGames).where(eq(userGames.userId, me.id));

  return NextResponse.json({ ...updated, gamesPlayed: games.map((row) => row.game) });
}
