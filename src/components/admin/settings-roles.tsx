"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTeamRole } from "@/lib/actions/assign-team-role";
import { removeTeamMember } from "@/lib/actions/remove-team-member";
import { Avatar } from "@/components/ui/avatar";
import type { AssignableRole } from "@/lib/validations/admin-settings";
import type { TeamMember } from "@/lib/admin/get-team";

const ROLE_OPTIONS: { key: AssignableRole; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "moderator", label: "Moderator" },
  { key: "support", label: "Support" },
  { key: "viewer", label: "Viewer" },
];

// FR-007/FR-008: role assignment (both a known member's dropdown and
// "Invite a team member" share the same assignTeamRole action --
// research.md #6, no separate invite-token/pending-invite entity).
export function SettingsRoles({ team }: { team: TeamMember[] }) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);

  async function handleRoleChange(member: TeamMember, role: AssignableRole) {
    setPendingUserId(member.id);
    await assignTeamRole({ email: member.email, role });
    setPendingUserId(null);
    router.refresh();
  }

  async function handleRemove(member: TeamMember) {
    setPendingUserId(member.id);
    await removeTeamMember({ userId: member.id });
    setPendingUserId(null);
    router.refresh();
  }

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInvitePending(true);
    setInviteError(null);
    const result = await assignTeamRole({ email, role: inviteRole });
    setInvitePending(false);
    if (!result.success) {
      setInviteError(result.error);
      return;
    }
    setInviteEmail("");
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-4.5 text-lg font-bold text-text">Roles & access</h2>

      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface-2">
        {team.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-dim">No team members yet.</p>
        ) : (
          team.map((member) => (
            <div key={member.id} className="flex items-center gap-3.5 border-b border-border px-4.5 py-3.5 last:border-b-0">
              <Avatar
                avatarImage={member.avatarImage}
                googleImage={member.image}
                avatarColor={member.avatarColor}
                handle={member.handle}
                className="h-9.5 w-9.5 shrink-0 rounded-[11px] text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text">@{member.handle}</div>
                <div className="truncate font-mono text-[10px] text-text-dim">{member.email}</div>
              </div>
              <label className="sr-only" htmlFor={`settings-role-${member.id}`}>
                Role for @{member.handle}
              </label>
              <select
                id={`settings-role-${member.id}`}
                value={member.role}
                disabled={pendingUserId === member.id}
                onChange={(event) => handleRoleChange(member, event.target.value as AssignableRole)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pendingUserId === member.id}
                onClick={() => handleRemove(member)}
                aria-label={`Remove @${member.handle} from the team`}
                className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-border text-sm text-text-dim disabled:opacity-60"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
        <div className="mb-2.5 text-sm font-semibold text-text">Invite a team member</div>
        <div className="flex gap-2">
          <label htmlFor="settings-invite-email" className="sr-only">
            Email
          </label>
          <input
            id="settings-invite-email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none"
          />
          <label htmlFor="settings-invite-role" className="sr-only">
            Role
          </label>
          <select
            id="settings-invite-role"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as AssignableRole)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={invitePending}
            onClick={handleInvite}
            className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            Send invite
          </button>
        </div>
        {inviteError && (
          <p role="alert" className="mt-2 text-sm text-pop-text">
            {inviteError}
          </p>
        )}
      </div>
    </div>
  );
}
