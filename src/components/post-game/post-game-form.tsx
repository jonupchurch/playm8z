"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPosting } from "@/lib/actions/create-posting";
import { TIME_SLOTS } from "@/lib/validations/browse-filters";
import { POSTING_AGE_GROUPS, postingAgeLabel, type PostingAgeGroup } from "@/lib/postings/age-label";
import { ListingCard, type ListingCardPosting } from "@/components/listings/listing-card";
import { didYouMean, typeaheadMatches, type GameEntry } from "@/lib/games/match-game-name";

type TimeSlot = (typeof TIME_SLOTS)[number];

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

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Mornings",
  afternoon: "Afternoons",
  evening: "Evenings",
  late: "Late night",
  weekend: "Weekends",
};

const GAME_SUGGESTIONS_FALLBACK: string[] = [];

function Segment({
  name,
  value,
  active,
  label,
  onSelect,
}: {
  name: string;
  value: string;
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="rounded-full border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

function Chip({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" checked={active} onChange={onToggle} className="peer sr-only" />
      <span className="rounded-full border border-border bg-surface-2 px-3.5 py-2 font-mono text-xs font-bold text-text peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2">
        {label}
      </span>
    </label>
  );
}

function Stepper({
  label,
  value,
  onIncrement,
  onDecrement,
  incrementLabel,
  decrementLabel,
  suffix,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel: string;
  decrementLabel: string;
  suffix: string;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-bold text-text">{label}</div>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onDecrement}
          aria-label={decrementLabel}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-lg text-text"
        >
          −
        </button>
        <span
          role="status"
          aria-label={label}
          className="min-w-5 text-center text-xl font-bold text-text"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={incrementLabel}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-lg text-text"
        >
          +
        </button>
        <span className="font-mono text-[11px] text-text-dim">{suffix}</span>
      </div>
    </div>
  );
}

export function PostGameForm({
  hostHandle,
  hostAvatarColor,
  hostAvatarImage,
  hostImage,
  gameSuggestions = GAME_SUGGESTIONS_FALLBACK,
  ratifiedGames = [],
  genres,
}: {
  hostHandle: string;
  hostAvatarColor: string | null;
  hostAvatarImage: string | null;
  hostImage: string | null;
  gameSuggestions?: string[];
  // Curated games + aliases (036), for the game typeahead + "did you mean?".
  // Plain serialisable data, passed from /post like gameSuggestions/genres so
  // no @/db-touching module is imported into this client component.
  ratifiedGames?: GameEntry[];
  // Admin-editable (030). Arrives as a prop from /post rather than being
  // imported: a client component importing a runtime value from a module
  // that reaches @/db crashes the page.
  genres: string[];
}) {
  const router = useRouter();
  const gameId = useId();
  const titleId = useId();
  const blurbId = useId();
  const tagsId = useId();
  const regionId = useId();
  const dateId = useId();
  const voiceLinkId = useId();

  const [game, setGame] = useState("");
  // 036 typeahead + "did you mean?". All matching is local and deterministic
  // (no AI, no per-keystroke server call) over the games list handed in.
  const [gameFocused, setGameFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ratifiedNames = useMemo(() => ratifiedGames.map((g) => g.canonical), [ratifiedGames]);
  const typeahead = useMemo(
    () => (gameFocused ? typeaheadMatches(game, ratifiedNames) : []),
    [gameFocused, game, ratifiedNames],
  );
  const didYouMeanGame = useMemo(() => didYouMean(game, ratifiedGames), [game, ratifiedGames]);

  function pickGame(name: string) {
    setGame(name);
    setGameFocused(false);
    setHighlight(-1);
  }

  const [genre, setGenre] = useState<string>("");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [tags, setTags] = useState("");
  const [vibe, setVibe] = useState<"fun" | "serious">("fun");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]["id"]>("pc");
  const [region, setRegion] = useState<(typeof REGION_OPTIONS)[number]["id"]>("na-east");
  // ADR 0009: defaults to "any" -- a host who never touches this field
  // claims nothing about who their party is for.
  const [ageGroup, setAgeGroup] = useState<PostingAgeGroup>("any");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [seatsOpen, setSeatsOpen] = useState(2);
  const [micRequired, setMicRequired] = useState(false);
  const [voiceLink, setVoiceLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = game.trim().length > 0 && title.trim().length > 0;

  function toggleTimeSlot(slot: TimeSlot) {
    setTimeSlots((current) =>
      current.includes(slot) ? current.filter((s) => s !== slot) : current.concat(slot),
    );
  }

  function incrementSeatsTotal() {
    setSeatsTotal((current) => Math.min(8, current + 1));
  }
  function decrementSeatsTotal() {
    const next = Math.max(2, seatsTotal - 1);
    setSeatsTotal(next);
    setSeatsOpen((open) => Math.min(open, next - 1));
  }
  function incrementSeatsOpen() {
    setSeatsOpen((current) => Math.min(seatsTotal - 1, current + 1));
  }
  function decrementSeatsOpen() {
    setSeatsOpen((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canPublish || submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await createPosting({
      game,
      genre,
      title,
      blurb,
      tags,
      vibe,
      platform,
      region,
      ageGroup,
      timeSlots,
      scheduledDate,
      recurring,
      seatsTotal,
      seatsOpen,
      micRequired,
      voiceLink,
    });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/browse");
  }

  const previewPosting: ListingCardPosting = {
    id: "preview",
    hostHandle,
    hostAvatarColor,
    hostAvatarImage,
    hostImage,
    game: game || "Your game",
    genre: genre || undefined,
    title: title || "Your listing title",
    blurb: blurb || "Add a description so players know the vibe and what you need.",
    vibe,
    region,
    timeSlots,
    seatsTotal,
    seatsOpen,
    createdAt: new Date(),
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_380px]"
    >
      <div className="flex flex-col gap-5">
        {/* 01 - Game */}
        <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
          <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
            01 · What are you playing?
          </h2>

          <label htmlFor={gameId} className="mb-1.5 block text-[13px] font-bold text-text">
            Game
          </label>
          <div className="relative">
            <input
              id={gameId}
              value={game}
              onChange={(event) => {
                setGame(event.target.value);
                setGameFocused(true);
                setHighlight(-1);
              }}
              onFocus={() => setGameFocused(true)}
              // Delay so a click on a suggestion registers before the list closes.
              onBlur={() => setTimeout(() => setGameFocused(false), 120)}
              onKeyDown={(event) => {
                if (typeahead.length === 0) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlight((h) => Math.min(h + 1, typeahead.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (event.key === "Enter" && highlight >= 0) {
                  // Only intercept Enter when a suggestion is highlighted;
                  // otherwise Enter submits the form as normal (FR-009).
                  event.preventDefault();
                  pickGame(typeahead[highlight]);
                } else if (event.key === "Escape") {
                  setGameFocused(false);
                  setHighlight(-1);
                }
              }}
              role="combobox"
              aria-expanded={typeahead.length > 0}
              aria-autocomplete="list"
              aria-controls="game-typeahead"
              placeholder="e.g. Valorant, D&D 5e, Catan…"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none focus:border-accent-2"
            />
            {typeahead.length > 0 && (
              <ul
                id="game-typeahead"
                role="listbox"
                className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-lg"
              >
                {typeahead.map((name, i) => (
                  <li key={name} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      // onMouseDown (not onClick) so it fires before the
                      // input's onBlur closes the list.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickGame(name);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`block w-full px-3.5 py-2 text-left text-sm ${i === highlight ? "bg-surface text-text" : "text-text-muted"}`}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* "Did you mean?" -- only when the typed value isn't an exact
              canonical match but is close to a known game (036/FR-004). */}
          {didYouMeanGame && (
            <p className="mt-2 text-[13px] text-text-muted">
              Did you mean{" "}
              <button
                type="button"
                onClick={() => pickGame(didYouMeanGame)}
                className="font-bold text-accent-2 underline hover:text-accent"
              >
                {didYouMeanGame}
              </button>
              ?
            </p>
          )}

          {gameSuggestions.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {gameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGame(suggestion)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-text-muted"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4.5 mb-2.5 text-[13px] font-bold text-text">Genre</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Genre">
            {genres.map((option) => (
              <Segment
                key={option}
                name="genre"
                value={option}
                active={genre === option}
                label={option}
                onSelect={() => setGenre(option)}
              />
            ))}
          </div>
        </section>

        {/* 02 - Pitch */}
        <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
          <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
            02 · The pitch
          </h2>

          <label htmlFor={titleId} className="mb-1.5 block text-[13px] font-bold text-text">
            Listing title
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 60))}
            maxLength={60}
            placeholder="e.g. Casual dives — all welcome"
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
          />
          <div className="mt-1 text-right font-mono text-[10px] text-text-dim">{title.length}/60</div>

          <label htmlFor={blurbId} className="mt-3 mb-1.5 block text-[13px] font-bold text-text">
            Description
          </label>
          <textarea
            id={blurbId}
            value={blurb}
            onChange={(event) => setBlurb(event.target.value.slice(0, 240))}
            maxLength={240}
            rows={3}
            placeholder="Vibe, expectations, what you need from teammates…"
            className="w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-3 text-sm leading-relaxed text-text outline-none"
          />
          <div className="mt-1 text-right font-mono text-[10px] text-text-dim">{blurb.length}/240</div>

          <label htmlFor={tagsId} className="mt-3 mb-1.5 block text-[13px] font-bold text-text">
            Keywords / tags
          </label>
          <input
            id={tagsId}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="chill, no-toxicity, VOD review… (comma separated)"
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
          />
        </section>

        {/* 03 - Vibe & setup */}
        <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
          <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
            03 · The vibe &amp; setup
          </h2>

          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
            <div>
              <div className="mb-2.5 text-[13px] font-bold text-text">Casual or serious</div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vibe">
                <Segment name="vibe" value="fun" active={vibe === "fun"} label="Casual" onSelect={() => setVibe("fun")} />
                <Segment name="vibe" value="serious" active={vibe === "serious"} label="Serious" onSelect={() => setVibe("serious")} />
              </div>
            </div>
            <div>
              <div className="mb-2.5 text-[13px] font-bold text-text">Platform</div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Platform">
                {PLATFORM_OPTIONS.map((option) => (
                  <Segment
                    key={option.id}
                    name="platform"
                    value={option.id}
                    active={platform === option.id}
                    label={option.label}
                    onSelect={() => setPlatform(option.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
            <div>
              <label htmlFor={regionId} className="mb-2.5 block text-[13px] font-bold text-text">
                Location / region
              </label>
              <select
                id={regionId}
                value={region}
                onChange={(event) => setRegion(event.target.value as typeof region)}
                className="w-full cursor-pointer rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-2.5 text-[13px] font-bold text-text">Age group</div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age group">
                {POSTING_AGE_GROUPS.map((option) => (
                  <Segment
                    key={option}
                    name="ageGroup"
                    value={option}
                    active={ageGroup === option}
                    label={postingAgeLabel(option)}
                    onSelect={() => setAgeGroup(option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4.5 mb-2.5 text-[13px] font-bold text-text">When do you play?</div>
          <div className="flex flex-wrap gap-1.5">
            {TIME_SLOTS.map((slot) => (
              <Chip
                key={slot}
                label={TIME_SLOT_LABELS[slot]}
                active={timeSlots.includes(slot)}
                onToggle={() => toggleTimeSlot(slot)}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
            <div>
              <label htmlFor={dateId} className="mb-2.5 block text-[13px] font-bold text-text">
                Specific date <span className="font-normal text-text-dim">(optional)</span>
              </label>
              <input
                id={dateId}
                type="date"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={() => setRecurring((current) => !current)}
                  className="h-4 w-4 shrink-0 accent-accent-2"
                />
                <span className="text-[13px] text-text">Recurring session</span>
              </label>
            </div>
          </div>
        </section>

        {/* 04 - Party & comms */}
        <section className="rounded-2xl border border-border bg-surface-2 p-5.5">
          <h2 className="mb-4 font-mono text-[10px] tracking-wider text-accent-2 uppercase">
            04 · Party &amp; comms
          </h2>

          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
            <Stepper
              label="Group size"
              value={seatsTotal}
              onIncrement={incrementSeatsTotal}
              onDecrement={decrementSeatsTotal}
              incrementLabel="Increase group size"
              decrementLabel="Decrease group size"
              suffix="players total"
            />
            <Stepper
              label="Spots open"
              value={seatsOpen}
              onIncrement={incrementSeatsOpen}
              onDecrement={decrementSeatsOpen}
              incrementLabel="Increase spots open"
              decrementLabel="Decrease spots open"
              suffix="looking for"
            />
          </div>

          <div className="mt-4.5 border-t border-border pt-4">
            <label className="mb-3.5 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={micRequired}
                onChange={() => setMicRequired((current) => !current)}
                className="h-4 w-4 shrink-0 accent-accent-2"
              />
              <span className="text-[13px] text-text">Mic required</span>
            </label>

            <label htmlFor={voiceLinkId} className="mb-1.5 block text-[13px] font-bold text-text">
              Voice channel <span className="font-normal text-text-dim">(optional)</span>
            </label>
            <input
              id={voiceLinkId}
              value={voiceLink}
              onChange={(event) => setVoiceLink(event.target.value)}
              placeholder="Discord invite link"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none"
            />
          </div>
        </section>
      </div>

      {/* Live preview + Publish */}
      <div className="sticky top-6 flex flex-col gap-4">
        <h2 className="font-mono text-[10px] tracking-wider text-text-dim uppercase">Live preview</h2>

        {/* The shared ListingCard renders a real Link to /listing/:id --
            this is an unsaved preview, not a navigable card yet, so clicks
            are neutralized in the capture phase before Link's own
            click handler (and its client-side navigation) ever runs. */}
        <div onClickCapture={(event) => event.preventDefault()}>
          <ListingCard posting={previewPosting} />
        </div>

        <div className="rounded-2xl border border-border bg-surface-2 p-4.5">
          {error && (
            <p role="alert" className="mb-3 text-sm text-pop-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!canPublish || submitting}
            className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3.5 text-sm font-bold text-on-accent disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface disabled:text-text-dim"
          >
            {submitting ? "Publishing…" : "Publish listing →"}
          </button>
          <p className="mt-3 text-center font-mono text-[10px] text-text-dim">
            {canPublish ? "Live instantly · edit or close it anytime" : "Add a game and a title to publish"}
          </p>
        </div>
      </div>
    </form>
  );
}
