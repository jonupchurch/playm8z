import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications, postings, questions, savedListings, users } from "@/db/schema";
import { getRoster } from "@/lib/postings/get-roster";
import { relativeAge } from "@/components/listings/listing-card";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";
import { Roster } from "@/components/listing/roster";
import { ApplyPanel } from "@/components/listing/apply-panel";
import { QaThread } from "@/components/listing/qa-thread";

const REGION_LABELS: Record<string, string> = {
  "na-east": "NA-East",
  "na-west": "NA-West",
  "eu-west": "EU-West",
  "eu-east": "EU-East",
  asia: "Asia",
  oceania: "Oceania",
};

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Mornings",
  afternoon: "Afternoons",
  evening: "Evenings",
  late: "Late night",
  weekend: "Weekends",
};

const PLATFORM_LABELS: Record<string, string> = {
  pc: "PC",
  console: "Console",
  cross: "Cross-play",
  table: "Tabletop",
};

// FR-001: public -- no login required to view. Viewer state (host /
// accepted / pending / full / not-applied) is derived server-side and
// drives apply-panel.tsx's branching; only *applying*/*asking*/*saving*
// are gated (FR-012/FR-013), never viewing.
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [posting] = await db
    .select({
      id: postings.id,
      hostId: postings.hostId,
      hostHandle: users.handle,
      hostAvatarColor: users.avatarColor,
      game: postings.game,
      genre: postings.genre,
      title: postings.title,
      blurb: postings.blurb,
      vibe: postings.vibe,
      region: postings.region,
      ageGroup: postings.ageGroup,
      timeSlots: postings.timeSlots,
      platform: postings.platform,
      micRequired: postings.micRequired,
      scheduledDate: postings.scheduledDate,
      tags: postings.tags,
      seatsTotal: postings.seatsTotal,
      seatsOpen: postings.seatsOpen,
      createdAt: postings.createdAt,
    })
    .from(postings)
    .innerJoin(users, eq(postings.hostId, users.id))
    .where(eq(postings.id, id));

  if (!posting) {
    notFound();
  }

  const session = await auth();
  let viewerId: string | null = null;
  if (session?.user?.email) {
    const [viewer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email));
    viewerId = viewer?.id ?? null;
  }

  const [roster, questionRows, ownApplication, savedRow] = await Promise.all([
    getRoster({ postingId: posting.id, hostId: posting.hostId, seatsTotal: posting.seatsTotal }),
    db
      .select({
        id: questions.id,
        askerId: questions.askerId,
        askerHandle: users.handle,
        askerAvatarColor: users.avatarColor,
        text: questions.text,
        reply: questions.reply,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .innerJoin(users, eq(questions.askerId, users.id))
      .where(eq(questions.postingId, posting.id))
      .orderBy(questions.createdAt),
    viewerId
      ? db
          .select({ id: applications.id, status: applications.status })
          .from(applications)
          .where(
            and(
              eq(applications.postingId, posting.id),
              eq(applications.applicantId, viewerId),
              inArray(applications.status, ["pending", "accepted"]),
            ),
          )
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ userId: savedListings.userId })
          .from(savedListings)
          .where(and(eq(savedListings.userId, viewerId), eq(savedListings.postingId, posting.id)))
      : Promise.resolve([]),
  ]);

  const isHost = viewerId === posting.hostId;
  const application = ownApplication[0];
  const viewerState: "host" | "accepted" | "pending" | "full" | "not-applied" = isHost
    ? "host"
    : application?.status === "accepted"
      ? "accepted"
      : application?.status === "pending"
        ? "pending"
        : posting.seatsOpen <= 0
          ? "full"
          : "not-applied";

  const isRecruiting = posting.seatsOpen > 0;
  const whenSummary = posting.timeSlots.length
    ? posting.timeSlots.map((slot) => TIME_SLOT_LABELS[slot] ?? slot).join(", ")
    : "Flexible";
  const scheduledDateLabel = posting.scheduledDate
    ? new Date(posting.scheduledDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const avatarGradient =
    AVATAR_COLORS.find((swatch) => swatch.id === posting.hostAvatarColor)?.gradient ??
    AVATAR_COLORS[0].gradient;

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-300 px-8 py-6">
        <nav className="mb-4.5 font-mono text-[11px] text-text-dim" aria-label="Breadcrumb">
          <Link href="/browse" className="text-text-muted">
            Browse
          </Link>{" "}
          <span>/</span>{" "}
          <Link href={`/browse?games=${encodeURIComponent(posting.game)}`} className="text-text-muted">
            {posting.game}
          </Link>{" "}
          <span>/</span> <span>{posting.title}</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            {/* Header */}
            <section className="rounded-2xl border border-border bg-surface-2 p-6">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-wider text-accent-2 uppercase">
                  {posting.game}
                  {posting.genre ? ` · ${posting.genre}` : ""}
                </span>
                {isRecruiting ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[11px] font-bold text-success">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"
                    />
                    Live · recruiting
                  </span>
                ) : (
                  <span className="rounded-full border border-text-dim/30 bg-text-dim/10 px-2.5 py-1 font-mono text-[11px] font-bold text-text-dim">
                    Full
                  </span>
                )}
              </div>
              <h1 className="mb-4 text-[28px] leading-tight font-bold tracking-tight">{posting.title}</h1>
              <div className="flex items-center gap-3">
                <div
                  style={{ background: avatarGradient }}
                  className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-on-accent"
                >
                  {(posting.hostHandle?.trim()[0] || "P").toUpperCase()}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-text">@{posting.hostHandle ?? "player"}</div>
                  <div className="font-mono text-[11px] text-text-muted">
                    Posted {relativeAge(posting.createdAt)} · {REGION_LABELS[posting.region] ?? posting.region}
                  </div>
                </div>
              </div>
            </section>

            {/* About */}
            <section className="rounded-2xl border border-border bg-surface-2 p-6">
              <h2 className="mb-3.5 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
                About this party
              </h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-text-muted">{posting.blurb}</p>
            </section>

            {/* Details */}
            <section className="rounded-2xl border border-border bg-surface-2 p-6">
              <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">Details</h2>
              <div className="grid grid-cols-2 gap-4.5 sm:grid-cols-3">
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">VIBE</div>
                  <div
                    className={
                      posting.vibe === "serious"
                        ? "text-sm font-bold text-pop-text"
                        : "text-sm font-bold text-accent-2"
                    }
                  >
                    {posting.vibe === "serious" ? "Serious" : "Casual"}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">PLATFORM</div>
                  <div className="text-sm font-bold text-text">
                    {PLATFORM_LABELS[posting.platform] ?? posting.platform}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">REGION</div>
                  <div className="text-sm font-bold text-text">
                    {REGION_LABELS[posting.region] ?? posting.region}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">AGE GROUP</div>
                  <div className="text-sm font-bold text-text">{posting.ageGroup}+</div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">WHEN</div>
                  <div className="text-sm font-bold text-text">
                    {whenSummary}
                    {scheduledDateLabel ? ` · ${scheduledDateLabel}` : ""}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] text-text-dim">MIC</div>
                  <div
                    className={
                      posting.micRequired ? "text-sm font-bold text-success" : "text-sm font-bold text-text-muted"
                    }
                  >
                    {posting.micRequired ? "Required" : "Not required"}
                  </div>
                </div>
              </div>
              {posting.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {posting.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <Roster roster={roster} seatsTotal={posting.seatsTotal} />

            <QaThread
              postingId={posting.id}
              questions={questionRows}
              isHost={isHost}
              isLoggedIn={viewerId !== null}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <ApplyPanel
              postingId={posting.id}
              hostId={posting.hostId}
              hostHandle={posting.hostHandle ?? "player"}
              title={posting.title}
              viewerState={viewerState}
              applicationId={application?.id}
              seatsOpen={posting.seatsOpen}
              seatsTotal={posting.seatsTotal}
              isLoggedIn={viewerId !== null}
              initialSaved={savedRow.length > 0}
            />

            <div className="rounded-2xl border border-border bg-surface-2 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div
                  style={{ background: avatarGradient }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-on-accent"
                >
                  {(posting.hostHandle?.trim()[0] || "P").toUpperCase()}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-text">@{posting.hostHandle ?? "player"}</div>
                </div>
              </div>
              <Link
                href={`/u/${posting.hostHandle ?? ""}`}
                className="block w-full rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-bold text-text"
              >
                View profile
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
