"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/lib/actions/toggle-follow";
import { inviteToParty } from "@/lib/actions/invite-to-party";
import { startConversation } from "@/lib/actions/start-conversation";
import { ReportModal, type ReportTarget } from "@/components/reports/report-modal";
import { BlockModal } from "@/components/blocking/block-modal";
import { AVATAR_COLORS } from "@/lib/validations/onboarding";

function avatarGradient(color: string | null) {
  return AVATAR_COLORS.find((swatch) => swatch.id === color)?.gradient ?? AVATAR_COLORS[0].gradient;
}

export type EligiblePosting = { id: string; game: string; title: string };

// FR-004/FR-005/FR-006/FR-007/FR-009/FR-010: identity, real (non-
// decorative) stats, and the action row -- Follow/Message/Invite/the
// "..." menu's Report/Block, none of which are offered on your own
// profile (edge case in spec.md). Follow/Message/Invite route a
// logged-out visitor to /login (apply-panel.tsx's own precedent) --
// the unverified-email case is handled entirely by each Server
// Action's own friendly error message, shown inline, no separate
// "isVerified" prop needed. Report/Block reuse `012`'s/`008`'s
// canonical flows directly (FR-009), Share is a plain client-side
// clipboard copy.
export function ProfileHeader({
  profileOwnerId,
  handle,
  bio,
  avatarColor,
  createdAt,
  stats,
  isOwnProfile,
  isLoggedIn,
  initialFollowing,
  eligiblePostings,
}: {
  profileOwnerId: string;
  handle: string;
  bio: string | null;
  avatarColor: string | null;
  createdAt: Date;
  stats: { sessions: number; avgRating: number | null; reviewCount: number };
  isOwnProfile: boolean;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  eligiblePostings: EligiblePosting[];
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [messagePending, setMessagePending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [invitePickerOpen, setInvitePickerOpen] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const inviteRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invitePickerOpen && !menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (invitePickerOpen && inviteRef.current && !inviteRef.current.contains(event.target as Node)) {
        setInvitePickerOpen(false);
      }
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setInvitePickerOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [invitePickerOpen, menuOpen]);

  async function handleToggleFollow() {
    setFollowPending(true);
    setFollowError(null);
    const result = await toggleFollow({ followeeId: profileOwnerId });
    setFollowPending(false);
    if (!result.success) {
      setFollowError(result.error);
      return;
    }
    setFollowing(result.following);
  }

  async function handleMessage() {
    setMessagePending(true);
    setMessageError(null);
    const result = await startConversation({ recipientIds: [profileOwnerId] });
    setMessagePending(false);
    if (!result.success) {
      setMessageError(result.error);
      return;
    }
    router.push(`/inbox/${result.conversationId}`);
  }

  async function handleInvite(postingId: string) {
    setInvitingId(postingId);
    setInviteError(null);
    const result = await inviteToParty({ postingId, invitedUserId: profileOwnerId });
    setInvitingId(null);
    if (!result.success) {
      setInviteError(result.error);
      return;
    }
    setInvitedIds((current) => [...current, postingId]);
  }

  const reportTarget: ReportTarget = {
    targetType: "user",
    targetId: profileOwnerId,
    label: `@${handle}`,
  };

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -- the
      // URL is still visible in the address bar, a non-critical nicety.
    }
    setMenuOpen(false);
  }

  return (
    <div className="border-b border-border bg-[radial-gradient(circle_at_20%_-60%,rgba(255,107,26,0.12),transparent_55%)]">
      <div className="mx-auto max-w-250 px-8 pt-8.5 pb-6.5">
        <div className="flex flex-wrap items-start gap-5.5">
          <div
            style={{ background: avatarGradient(avatarColor) }}
            className="flex h-23 w-23 shrink-0 items-center justify-center rounded-[24px] text-4xl font-bold text-on-accent shadow-[0_12px_30px_-12px_rgba(255,107,26,0.7)]"
          >
            {handle.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-65 flex-1">
            <h1 className="text-[28px] font-bold tracking-tight text-text">@{handle}</h1>
            <div className="mt-1 font-mono text-xs text-text-muted">
              Member since {createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short" })}
            </div>
            {bio && <p className="mt-3 max-w-130 text-sm leading-relaxed text-text-muted">{bio}</p>}
          </div>

          {!isOwnProfile && (
            <div className="flex min-w-47.5 flex-col gap-2.25">
              {!isLoggedIn ? (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.75 text-center text-sm font-bold text-on-accent"
                  >
                    Invite to a party
                  </Link>
                  <div className="flex gap-2.25">
                    <Link
                      href="/login"
                      className="flex-1 rounded-xl border border-border bg-surface-2 py-2.75 text-center text-sm font-semibold text-text"
                    >
                      Message
                    </Link>
                    <Link
                      href="/login"
                      className="flex-1 rounded-xl border border-border bg-surface-2 py-2.75 text-center text-sm font-semibold text-text"
                    >
                      Follow
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div ref={inviteRef} className="relative">
                    <button
                      type="button"
                      disabled={eligiblePostings.length === 0}
                      aria-haspopup="true"
                      aria-expanded={invitePickerOpen}
                      title={eligiblePostings.length === 0 ? "Host an open party with a free seat to invite this player" : undefined}
                      onClick={() => setInvitePickerOpen((value) => !value)}
                      className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.75 text-sm font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Invite to a party
                    </button>
                    {eligiblePostings.length === 0 && (
                      <p className="mt-1.5 text-center text-[11px] text-text-dim">
                        Host an open party with a free seat to invite this player.
                      </p>
                    )}
                    {invitePickerOpen && eligiblePostings.length > 0 && (
                      <div
                        role="menu"
                        aria-label="Choose a party to invite to"
                        className="absolute top-12 right-0 left-0 z-30 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
                      >
                        {eligiblePostings.map((posting) => (
                          <button
                            key={posting.id}
                            type="button"
                            role="menuitem"
                            disabled={invitingId === posting.id || invitedIds.includes(posting.id)}
                            onClick={() => handleInvite(posting.id)}
                            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-text hover:bg-surface disabled:opacity-60"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {posting.game} — {posting.title}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] font-bold text-pop-text">
                              {invitedIds.includes(posting.id) ? "Invited ✓" : invitingId === posting.id ? "…" : "Invite"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {inviteError && (
                      <p role="alert" className="mt-1.5 text-center text-[11px] text-pop-text">
                        {inviteError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.25">
                    <button
                      type="button"
                      onClick={handleMessage}
                      disabled={messagePending}
                      className="flex-1 rounded-xl border border-border bg-surface-2 py-2.75 text-sm font-semibold text-text disabled:opacity-60"
                    >
                      {messagePending ? "…" : "Message"}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={followPending}
                      aria-pressed={following}
                      className={
                        following
                          ? "flex-1 rounded-xl border border-[rgba(78,201,106,0.4)] bg-[rgba(78,201,106,0.12)] py-2.75 text-sm font-semibold text-[#8fe0a3] disabled:opacity-60"
                          : "flex-1 rounded-xl border border-border bg-surface-2 py-2.75 text-sm font-semibold text-text disabled:opacity-60"
                      }
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                    <div ref={menuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((value) => !value)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        aria-label="More profile actions"
                        className="flex h-full w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-base font-bold text-text-muted"
                      >
                        ⋯
                      </button>
                      {menuOpen && (
                        <div
                          role="menu"
                          aria-label="More profile actions"
                          className="absolute top-11 right-0 z-30 w-45 overflow-hidden rounded-xl border border-border bg-surface-2 py-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleShare}
                            className="block w-full px-3.5 py-2.5 text-left text-[13px] text-text hover:bg-surface"
                          >
                            🔗 {shareCopied ? "Copied!" : "Share profile"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              setReportOpen(true);
                            }}
                            className="block w-full border-t border-border px-3.5 py-2.5 text-left text-[13px] text-pop-text hover:bg-surface"
                          >
                            ⚑ Report user
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              setBlockOpen(true);
                            }}
                            className="block w-full border-t border-border px-3.5 py-2.5 text-left text-[13px] text-pop-text hover:bg-surface"
                          >
                            ⛔ Block user
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {messageError && (
                    <p role="alert" className="text-center text-[11px] text-pop-text">
                      {messageError}
                    </p>
                  )}
                  {followError && (
                    <p role="alert" className="text-center text-[11px] text-pop-text">
                      {followError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-7.5">
          <div>
            <div className="text-[22px] font-bold text-[#4ec96a]">
              {stats.reviewCount > 0 ? stats.avgRating?.toFixed(1) : "—"}
            </div>
            <div className="font-mono text-[10px] text-text-dim">
              rating · {stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"}
            </div>
          </div>
          <div>
            <div className="text-[22px] font-bold text-text">{stats.sessions}</div>
            <div className="font-mono text-[10px] text-text-dim">sessions</div>
          </div>
        </div>
      </div>

      {!isOwnProfile && isLoggedIn && (
        <>
          <ReportModal open={reportOpen} target={reportTarget} onClose={() => setReportOpen(false)} />
          <BlockModal
            open={blockOpen}
            preSelected={{ id: profileOwnerId, handle, avatarColor }}
            onClose={() => setBlockOpen(false)}
          />
        </>
      )}
    </div>
  );
}
