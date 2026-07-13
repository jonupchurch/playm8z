"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closePosting, editPosting, reopenPosting } from "@/lib/actions/manage-posting";
import type { PostingInput } from "@/lib/validations/posting";

export type ManagedPosting = {
  id: string;
  game: string;
  genre: string | null;
  title: string;
  blurb: string;
  vibe: string;
  platform: string;
  region: string;
  ageGroup: string;
  timeSlots: string[];
  micRequired: boolean;
  tags: string[];
  recurring: boolean;
  voiceLink: string | null;
  seatsTotal: number;
  seatsOpen: number;
  status: string;
  applicantCount: number;
  hasAccepted: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] text-on-accent",
  full: "border border-info/30 bg-info/10 text-info",
  closed: "border border-border bg-surface text-text-dim",
};

const PLATFORM_OPTIONS = [
  { id: "pc", label: "PC" },
  { id: "console", label: "Console" },
  { id: "cross", label: "Cross-play" },
  { id: "table", label: "Tabletop" },
] as const;

const REGION_OPTIONS = [
  { id: "na-east", label: "NA-East" },
  { id: "na-west", label: "NA-West" },
  { id: "eu-west", label: "EU-West" },
  { id: "eu-east", label: "EU-East" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
] as const;

export function PostingManagementCard({ posting }: { posting: ManagedPosting }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(posting.title);
  const [blurb, setBlurb] = useState(posting.blurb);
  const [tags, setTags] = useState(posting.tags.join(", "));
  const [vibe, setVibe] = useState(posting.vibe);
  const [platform, setPlatform] = useState(posting.platform);
  const [region, setRegion] = useState(posting.region);
  const [ageGroup, setAgeGroup] = useState(posting.ageGroup);
  const [micRequired, setMicRequired] = useState(posting.micRequired);
  const [seatsTotal, setSeatsTotal] = useState(posting.seatsTotal);
  const [seatsOpen, setSeatsOpen] = useState(posting.seatsOpen);

  async function handleManage() {
    setSubmitting(true);
    setError(null);
    const result =
      posting.status === "closed" ? await reopenPosting(posting.id) : await closePosting(posting.id);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const input: PostingInput = {
      game: posting.game,
      genre: posting.genre ?? "",
      title,
      blurb,
      tags,
      vibe: vibe as PostingInput["vibe"],
      platform: platform as PostingInput["platform"],
      region: region as PostingInput["region"],
      ageGroup: ageGroup as PostingInput["ageGroup"],
      timeSlots: posting.timeSlots as PostingInput["timeSlots"],
      scheduledDate: "",
      recurring: posting.recurring,
      seatsTotal,
      seatsOpen,
      micRequired,
      voiceLink: posting.voiceLink ?? "",
    };

    const result = await editPosting(posting.id, input);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tracking-wider text-accent-2 uppercase">
          {posting.game}
        </span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${STATUS_STYLES[posting.status] ?? ""}`}>
          {posting.status === "open" ? "Open" : posting.status === "full" ? "Full" : "Closed"}
        </span>
      </div>

      {!editing ? (
        <>
          <h3 className="mb-1.5 text-base leading-snug font-bold text-text">{posting.title}</h3>
          <p className="mb-3.5 flex-1 text-[13px] leading-relaxed text-text-muted">{posting.blurb}</p>
          <div className="mb-3.5 font-mono text-[11px] text-text-muted">
            {posting.seatsOpen}/{posting.seatsTotal} open · {posting.applicantCount} applicant
            {posting.applicantCount === 1 ? "" : "s"}
          </div>
          {error && (
            <p role="alert" className="mb-2.5 text-xs text-pop-text">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {!posting.hasAccepted && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex-1 rounded-lg border border-border bg-surface-2 py-2.5 text-sm font-bold text-text"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={handleManage}
              disabled={submitting}
              className="flex-1 rounded-lg border border-pop/40 py-2.5 text-sm font-bold text-pop-text disabled:opacity-60"
            >
              {posting.status === "closed" ? "Reopen" : "Close"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-2.5">
          <label htmlFor={`edit-title-${posting.id}`} className="sr-only">
            Title
          </label>
          <input
            id={`edit-title-${posting.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 60))}
            placeholder="Title"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
          />
          <label htmlFor={`edit-blurb-${posting.id}`} className="sr-only">
            Description
          </label>
          <textarea
            id={`edit-blurb-${posting.id}`}
            value={blurb}
            onChange={(event) => setBlurb(event.target.value.slice(0, 240))}
            rows={2}
            className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
          />
          <label htmlFor={`edit-tags-${posting.id}`} className="sr-only">
            Tags
          </label>
          <input
            id={`edit-tags-${posting.id}`}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Vibe"
              value={vibe}
              onChange={(event) => setVibe(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              <option value="fun">Casual</option>
              <option value="serious">Serious</option>
            </select>
            <select
              aria-label="Platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Age group"
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none"
            >
              <option value="18">18+</option>
              <option value="21">21+</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor={`edit-seats-total-${posting.id}`} className="text-xs text-text-muted">
              Group size
            </label>
            <input
              id={`edit-seats-total-${posting.id}`}
              type="number"
              min={2}
              max={8}
              value={seatsTotal}
              onChange={(event) => setSeatsTotal(Number(event.target.value))}
              className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none"
            />
            <label htmlFor={`edit-seats-open-${posting.id}`} className="text-xs text-text-muted">
              Spots open
            </label>
            <input
              id={`edit-seats-open-${posting.id}`}
              type="number"
              min={1}
              max={seatsTotal - 1}
              value={seatsOpen}
              onChange={(event) => setSeatsOpen(Number(event.target.value))}
              className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={micRequired}
              onChange={() => setMicRequired((current) => !current)}
              className="h-4 w-4 accent-accent-2"
            />
            <span className="text-[13px] text-text">Mic required</span>
          </label>

          {error && (
            <p role="alert" className="text-xs text-pop-text">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-bold text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
