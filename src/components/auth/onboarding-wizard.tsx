"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AGE_GROUPS,
  AVATAR_COLORS,
  PLATFORMS,
  PLAY_TIME_SLOTS,
  REGIONS,
  VIBES,
} from "@/lib/validations/onboarding";
import { useHandleAvailability } from "@/lib/hooks/use-handle-availability";

// A fixed suggested list to pick from -- not a claim of trending/live
// data (games remain free text platform-wide per ADR 0001), just a
// practical starting set spanning video games and tabletop/TTRPG (FR-009).
const SUGGESTED_GAMES = [
  "Valorant",
  "Helldivers 2",
  "Baldur's Gate 3",
  "CS2",
  "Deep Rock Galactic",
  "Lethal Company",
  "Sea of Thieves",
  "League of Legends",
  "Overwatch 2",
  "Minecraft",
  "Elden Ring",
  "D&D 5e",
  "Catan",
  "Magic: The Gathering",
];

const STEP_COUNT = 4;

type Profile = {
  name: string;
  avatarColor: string;
  gamesPlayed: string[];
  region: string;
  platforms: string[];
  ageGroup: string;
  vibe: string;
  playTimeSlots: string[];
};

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-2 font-mono text-xs font-bold text-on-accent"
    : "rounded-full border border-border px-4 py-2 font-mono text-xs font-bold text-text";
}

function bigChipClass(active: boolean) {
  return active
    ? "flex-1 rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4 py-3.5 text-sm font-bold text-on-accent"
    : "flex-1 rounded-xl border border-border px-4 py-3.5 text-sm font-bold text-text";
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

async function saveOnboarding(
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => null);
  return { ok: false, error: data?.error ?? "Something went wrong. Please try again." };
}

function buildSummary(profile: Profile) {
  const summary: string[] = [];
  if (profile.gamesPlayed.length) {
    summary.push(`${profile.gamesPlayed.length} game${profile.gamesPlayed.length > 1 ? "s" : ""}`);
  }
  const region = REGIONS.find((r) => r.id === profile.region);
  if (region) summary.push(region.label);
  if (profile.vibe) {
    summary.push(
      profile.vibe === "fun" ? "Casual" : profile.vibe === "serious" ? "Serious" : "Casual + Serious",
    );
  }
  return summary;
}

export function OnboardingWizard({
  needsHandle,
  initialProfile,
}: {
  needsHandle: boolean;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<"wizard" | "done">("wizard");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneSummary, setDoneSummary] = useState<string[]>([]);

  const handleCheck = useHandleAvailability(handle, needsHandle);

  const stepValid = [
    profile.name.trim().length > 0 && (!needsHandle || handleCheck?.available === true),
    profile.gamesPlayed.length > 0,
    profile.region !== "" && profile.ageGroup !== "",
    profile.vibe !== "",
  ][step];

  function currentStepPatch(): Record<string, unknown> {
    if (step === 0) {
      const patch: Record<string, unknown> = {
        name: profile.name.trim(),
        avatarColor: profile.avatarColor,
      };
      if (needsHandle) patch.handle = handle;
      return patch;
    }
    if (step === 1) return { gamesPlayed: profile.gamesPlayed };
    if (step === 2) {
      return { region: profile.region, platforms: profile.platforms, ageGroup: profile.ageGroup };
    }
    return { vibe: profile.vibe, playTimeSlots: profile.playTimeSlots };
  }

  async function handleContinue() {
    if (!stepValid || saving) return;
    setSaving(true);
    setError(null);

    const result = await saveOnboarding(currentStepPatch());
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    if (step >= STEP_COUNT - 1) {
      setDoneSummary(buildSummary(profile));
      setScreen("done");
    } else {
      setStep(step + 1);
    }
  }

  function handleBack() {
    setError(null);
    if (step > 0) setStep(step - 1);
  }

  async function handleSkip() {
    if (saving) return;
    setSaving(true);

    // Best-effort: only send fields the current step actually has a value
    // for (FR-012 -- "whatever was already entered," nothing more).
    const patch: Record<string, unknown> = {};
    if (step === 0) {
      if (profile.name.trim()) patch.name = profile.name.trim();
      if (needsHandle && handle && handleCheck?.available) patch.handle = handle;
    } else if (step === 1) {
      if (profile.gamesPlayed.length) patch.gamesPlayed = profile.gamesPlayed;
    } else if (step === 2) {
      if (profile.region) patch.region = profile.region;
      if (profile.platforms.length) patch.platforms = profile.platforms;
      if (profile.ageGroup) patch.ageGroup = profile.ageGroup;
    } else {
      if (profile.vibe) patch.vibe = profile.vibe;
      if (profile.playTimeSlots.length) patch.playTimeSlots = profile.playTimeSlots;
    }

    if (Object.keys(patch).length > 0) await saveOnboarding(patch);

    setSaving(false);
    setDoneSummary(buildSummary(profile));
    setScreen("done");
  }

  if (screen === "done") {
    return (
      <div className="w-full max-w-[480px] rounded-[20px] border border-border bg-surface-2 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-success/50 bg-success/15">
          <span className="text-3xl font-bold text-success">✓</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text">
          {profile.name.trim() ? `You're all set, ${profile.name.trim()}!` : "You're all set!"}
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-text-muted">
          Your party is out there. We&apos;ve lined up games that match your setup — jump in
          whenever.
        </p>
        {doneSummary.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {doneSummary.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] py-3 text-[15px] font-bold text-on-accent"
        >
          Start browsing games →
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[600px]">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-xs text-text-muted">
          Step {step + 1} of {STEP_COUNT}
        </span>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="font-mono text-xs text-text-dim hover:text-text-muted"
        >
          Skip for now
        </button>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] transition-all duration-300"
          style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
        />
      </div>

      <div className="rounded-[20px] border border-border bg-surface-2 p-7 shadow-2xl">
        {step === 0 && (
          <>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight text-text">
              Welcome! Let&apos;s set you up
            </h1>
            <p className="mb-5 text-sm text-text-muted">
              This takes about a minute and makes matchmaking way better.
            </p>
            <div className="mb-5 flex items-center gap-4">
              <div
                style={{
                  background: AVATAR_COLORS.find((a) => a.id === profile.avatarColor)?.gradient,
                }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-on-accent"
              >
                {(profile.name.trim()[0] || "P").toUpperCase()}
              </div>
              <div className="flex-1">
                <label htmlFor="displayName" className="mb-1.5 block text-sm font-semibold text-text">
                  Display name
                </label>
                <input
                  id="displayName"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  placeholder="What should players call you?"
                  className="w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-[15px] text-text outline-none placeholder:text-text-dim focus:border-accent-2"
                />
              </div>
            </div>
            {needsHandle && (
              <div className="mb-5">
                <label
                  htmlFor="onboardingHandle"
                  className="mb-1.5 block text-sm font-semibold text-text"
                >
                  Username
                </label>
                <input
                  id="onboardingHandle"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="pick a handle"
                  className="w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-[15px] text-text outline-none placeholder:text-text-dim focus:border-accent-2"
                  aria-describedby="onboarding-handle-status"
                />
                <p id="onboarding-handle-status" className="mt-1 min-h-4 text-xs" aria-live="polite">
                  {handleCheck?.handle === handle &&
                    handle.length > 0 &&
                    (handleCheck.available ? (
                      <span className="text-success">Available</span>
                    ) : (
                      <span className="text-pop">
                        {handleCheck.reason ?? "That handle is already taken."}
                      </span>
                    ))}
                </p>
              </div>
            )}
            <label className="mb-2.5 block text-sm font-semibold text-text">Avatar color</label>
            <div className="flex gap-2.5">
              {AVATAR_COLORS.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, avatarColor: swatch.id })}
                  aria-label={swatch.id}
                  aria-pressed={profile.avatarColor === swatch.id}
                  style={{
                    background: swatch.gradient,
                    boxShadow:
                      profile.avatarColor === swatch.id
                        ? "0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)"
                        : "0 0 0 1px var(--color-border)",
                  }}
                  className="h-9 w-9 rounded-[11px]"
                />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight text-text">What do you play?</h1>
            <p className="mb-5 text-sm text-text-muted">
              Pick a few — we&apos;ll surface matching parties first. ({profile.gamesPlayed.length}{" "}
              selected)
            </p>
            <div className="flex flex-wrap gap-2.5">
              {SUGGESTED_GAMES.map((game) => (
                <button
                  key={game}
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, gamesPlayed: toggle(profile.gamesPlayed, game) })
                  }
                  aria-pressed={profile.gamesPlayed.includes(game)}
                  className={chipClass(profile.gamesPlayed.includes(game))}
                >
                  {game}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight text-text">
              Where &amp; how do you play?
            </h1>
            <p className="mb-5 text-sm text-text-muted">
              Helps us match region, platform and age-appropriate groups.
            </p>
            <label htmlFor="region" className="mb-2 block text-sm font-semibold text-text">
              Region
            </label>
            <select
              id="region"
              value={profile.region}
              onChange={(event) => setProfile({ ...profile, region: event.target.value })}
              className="mb-5 w-full appearance-none rounded-[10px] border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none focus:border-accent-2"
            >
              <option value="">Select your region…</option>
              {REGIONS.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
            <label className="mb-2.5 block text-sm font-semibold text-text">Platforms</label>
            <div className="mb-5 flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, platforms: toggle(profile.platforms, platform.id) })
                  }
                  aria-pressed={profile.platforms.includes(platform.id)}
                  className={chipClass(profile.platforms.includes(platform.id))}
                >
                  {platform.label}
                </button>
              ))}
            </div>
            <label className="mb-2.5 block text-sm font-semibold text-text">Age group</label>
            <div className="flex gap-2">
              {AGE_GROUPS.map((age) => (
                <button
                  key={age.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, ageGroup: age.id })}
                  aria-pressed={profile.ageGroup === age.id}
                  className={chipClass(profile.ageGroup === age.id)}
                >
                  {age.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight text-text">
              What&apos;s your vibe?
            </h1>
            <p className="mb-5 text-sm text-text-muted">
              So we match you with people who play the way you do.
            </p>
            <label className="mb-2.5 block text-sm font-semibold text-text">
              Casual or serious?
            </label>
            <div className="mb-5 flex gap-2">
              {VIBES.map((vibe) => (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, vibe: vibe.id })}
                  aria-pressed={profile.vibe === vibe.id}
                  className={bigChipClass(profile.vibe === vibe.id)}
                >
                  {vibe.label}
                </button>
              ))}
            </div>
            <label className="mb-2.5 block text-sm font-semibold text-text">
              When do you usually play?
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAY_TIME_SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      playTimeSlots: toggle(profile.playTimeSlots, slot.id),
                    })
                  }
                  aria-pressed={profile.playTimeSlots.includes(slot.id)}
                  className={chipClass(profile.playTimeSlots.includes(slot.id))}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mt-5 text-sm text-pop">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-[11px] border border-border bg-bg px-5 py-3 text-sm font-semibold text-text"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!stepValid || saving}
            className="flex-1 rounded-[11px] py-3 text-[15px] font-bold enabled:bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] enabled:text-on-accent disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-dim"
          >
            {step >= STEP_COUNT - 1 ? "Finish setup →" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
