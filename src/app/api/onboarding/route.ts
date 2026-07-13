import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
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
  gamesPlayed: users.gamesPlayed,
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

  return NextResponse.json(updated);
}
