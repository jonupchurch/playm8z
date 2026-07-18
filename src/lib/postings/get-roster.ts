import { FALLBACK_HANDLE } from "@/lib/fallback-handle";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema";

export type RosterRow =
  | { kind: "host"; handle: string; avatarColor: string | null; avatarImage: string | null; image: string | null }
  | { kind: "member"; handle: string; avatarColor: string | null; avatarImage: string | null; image: string | null }
  | { kind: "open" };

export type Roster = { rows: RosterRow[]; openCount: number };

// No RosterSlot table (research.md #1, ADR 0004 already removed the
// only field -- role -- that would distinguish one from a plain
// Application) -- derived per request from the host plus accepted
// applications. Accepts the posting's own hostId/seatsTotal directly
// rather than re-fetching the posting, since the page already has it.
export async function getRoster(params: {
  postingId: string;
  hostId: string;
  seatsTotal: number;
}): Promise<Roster> {
  const [[host], members] = await Promise.all([
    db
      .select({ handle: users.handle, avatarColor: users.avatarColor, avatarImage: users.avatarImage, image: users.image })
      .from(users)
      .where(eq(users.id, params.hostId)),
    db
      .select({ handle: users.handle, avatarColor: users.avatarColor, avatarImage: users.avatarImage, image: users.image })
      .from(applications)
      .innerJoin(users, eq(applications.applicantId, users.id))
      .where(and(eq(applications.postingId, params.postingId), eq(applications.status, "accepted"))),
  ]);

  const openCount = Math.max(0, params.seatsTotal - 1 - members.length);

  const rows: RosterRow[] = [
    {
      kind: "host",
      handle: host?.handle ?? FALLBACK_HANDLE,
      avatarColor: host?.avatarColor ?? null,
      avatarImage: host?.avatarImage ?? null,
      image: host?.image ?? null,
    },
    ...members.map((member) => ({
      kind: "member" as const,
      handle: member.handle ?? FALLBACK_HANDLE,
      avatarColor: member.avatarColor,
      avatarImage: member.avatarImage,
      image: member.image,
    })),
    ...Array.from({ length: openCount }, (): RosterRow => ({ kind: "open" })),
  ];

  return { rows, openCount };
}
