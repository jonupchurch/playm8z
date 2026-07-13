import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postings, userGames, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { GamesList } from "@/components/profile/games-list";
import { PLATFORMS } from "@/lib/validations/onboarding";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

const STATUS_LABELS: Record<string, string> = { open: "Open", full: "Full" };

// US1's Overview tab: the games list (editable), an active-postings
// preview linking to the full My postings tab, and a public-info
// sidebar. Pronouns/languages/timezone/Connected Accounts are omitted
// entirely -- nothing collects them anywhere in this project (spec.md
// Assumptions).
export default async function ProfileOverviewPage() {
  const authUser = await requireAuth();
  const [user] = await db
    .select({
      id: users.id,
      region: users.region,
      ageGroup: users.ageGroup,
      platforms: users.platforms,
    })
    .from(users)
    .where(eq(users.id, authUser.id));

  const [games, activePostings] = await Promise.all([
    db
      .select({ id: userGames.id, game: userGames.game, rank: userGames.rank, hoursPlayed: userGames.hoursPlayed })
      .from(userGames)
      .where(eq(userGames.userId, user.id)),
    db
      .select({ id: postings.id, game: postings.game, title: postings.title, status: postings.status })
      .from(postings)
      .where(and(eq(postings.hostId, user.id), inArray(postings.status, ["open", "full"]))),
  ]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <GamesList games={games} />

        <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[10px] tracking-wider text-accent-2 uppercase">Active postings</h2>
            <Link href="/profile/postings" className="font-mono text-xs text-text-muted">
              view all →
            </Link>
          </div>
          {activePostings.length === 0 ? (
            <p className="text-sm text-text-muted">No active postings.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activePostings.map((posting) => (
                <div
                  key={posting.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
                >
                  <div className="flex-1">
                    <div className="mb-0.5 font-mono text-[10px] text-accent-2">{posting.game}</div>
                    <div className="text-sm font-bold text-text">{posting.title}</div>
                  </div>
                  <span
                    className={
                      posting.status === "open"
                        ? "rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-2.5 py-1 font-mono text-[10px] font-bold text-on-accent"
                        : "rounded-full border border-info/30 bg-info/10 px-2.5 py-1 font-mono text-[10px] font-bold text-info"
                    }
                  >
                    {STATUS_LABELS[posting.status] ?? posting.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[10px] tracking-wider text-accent-2 uppercase">Public info</h2>
          <span className="font-mono text-[9px] text-text-dim">visible to all</span>
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <div className="mb-1 font-mono text-[10px] text-text-dim">REGION</div>
            <div className="text-sm font-bold text-text">{REGION_LABELS[user.region ?? ""] ?? "—"}</div>
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] text-text-dim">AGE GROUP</div>
            <div className="text-sm font-bold text-text">{user.ageGroup ? `${user.ageGroup}+` : "—"}</div>
          </div>
          {user.platforms && user.platforms.length > 0 && (
            <div>
              <div className="mb-1.5 font-mono text-[10px] text-text-dim">PLATFORMS</div>
              <div className="flex flex-wrap gap-1.5">
                {user.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-text-muted"
                  >
                    {PLATFORMS.find((option) => option.id === platform)?.label ?? platform}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
