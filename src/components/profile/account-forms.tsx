"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { updateProfile } from "@/lib/actions/update-profile";
import { changePassword } from "@/lib/actions/change-password";
import { updateEmail } from "@/lib/actions/update-email";
import { removeAvatar, uploadAvatar } from "@/lib/actions/update-avatar";

const REGION_OPTIONS = [
  { id: "na-east", label: "NA-East" },
  { id: "na-west", label: "NA-West" },
  { id: "eu-west", label: "EU-West" },
  { id: "eu-east", label: "EU-East" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
] as const;

export function AccountForms({
  handle,
  name,
  region,
  bio,
  email,
  avatarColor,
  avatarImage,
  image,
  hasPassword,
}: {
  handle: string;
  name: string;
  region: string;
  bio: string;
  email: string;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
  hasPassword: boolean;
}) {
  return (
    <div className="flex flex-col gap-4.5">
      <AvatarForm
        handle={handle}
        avatarColor={avatarColor}
        avatarImage={avatarImage}
        image={image}
      />
      <PersonalInfoForm handle={handle} initialName={name} initialRegion={region} initialBio={bio} />
      {hasPassword && <PasswordForm />}
      <EmailForm initialEmail={email} />
    </div>
  );
}

function AvatarForm({
  handle,
  avatarColor,
  avatarImage,
  image,
}: {
  handle: string;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
}) {
  const router = useRouter();
  // Local echo of the uploaded avatar so the preview updates without a full
  // reload; the Server Action revalidates the real surfaces (034/FR-001).
  const [uploaded, setUploaded] = useState<string | null>(avatarImage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      // try/catch matters: 029's original bug was a thrown action crashing
      // the editor. A returned {success:false} is handled below; a thrown
      // one is caught here.
      const result = await uploadAvatar(formData);
      if (result.success) {
        setUploaded(result.url);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Couldn't upload this image right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setPending(true);
    try {
      const result = await removeAvatar();
      if (result.success) {
        setUploaded(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Couldn't remove your photo right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-1 text-lg font-bold text-text">Profile photo</h2>
      <p className="mb-4 text-[13px] text-text-dim">
        Upload a photo, or leave it and we&apos;ll use your initial.
      </p>

      <div className="flex items-center gap-5">
        <Avatar
          avatarImage={uploaded}
          googleImage={image}
          avatarColor={avatarColor}
          handle={handle}
          className="h-20 w-20 shrink-0 rounded-[20px] text-3xl"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-text disabled:opacity-60"
            >
              {pending ? "Working…" : uploaded ? "Replace photo" : "Upload photo"}
            </button>
            {uploaded && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={pending}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-pop-text disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
          <p className="font-mono text-[11px] text-text-dim">JPEG, PNG, or WebP · up to 5MB</p>
          {error && (
            <p role="alert" className="text-[13px] text-pop-text">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </section>
  );
}

function PersonalInfoForm({
  handle,
  initialName,
  initialRegion,
  initialBio,
}: {
  handle: string;
  initialName: string;
  initialRegion: string;
  initialBio: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [region, setRegion] = useState(initialRegion);
  const [bio, setBio] = useState(initialBio);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const result = await updateProfile({ name, region, bio: bio || undefined });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-1 text-lg font-bold text-text">Personal information</h2>
      <p className="mb-5 text-[13px] text-text-dim">
        Some of this is public — control what shows under Privacy below.
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="account-name" className="mb-1.5 block text-[13px] font-bold text-text">
            Display name
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 50))}
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label htmlFor="account-handle" className="mb-1.5 block text-[13px] font-bold text-text">
            Username
          </label>
          {/* FR-002: always read-only text, never an input -- handles are immutable once set. */}
          <p id="account-handle" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-muted">
            @{handle}
          </p>
        </div>
        <div>
          <label htmlFor="account-region" className="mb-1.5 block text-[13px] font-bold text-text">
            Region
          </label>
          <select
            id="account-region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="w-full cursor-pointer rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          >
            {REGION_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="account-bio" className="mb-1.5 block text-[13px] font-bold text-text">
            Bio
          </label>
          <textarea
            id="account-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 300))}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-text outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-pop-text sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 sm:col-span-2">
          {saved && <span className="text-xs text-success">Saved</span>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSubmitting(true);
    const result = await changePassword({ currentPassword, newPassword });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-5 text-lg font-bold text-text">Change password</h2>
      <form onSubmit={handleSubmit} className="flex max-w-105 flex-col gap-4">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-[13px] font-bold text-text">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-bold text-text">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-[13px] font-bold text-text">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-pop-text">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-success">Password updated</span>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function EmailForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSent(false);
    const result = await updateEmail({ email });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-1 text-lg font-bold text-text">Email</h2>
      <p className="mb-5 text-[13px] text-text-dim">
        Changing your email requires verifying the new address before it takes effect.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-105 items-end gap-3">
        <div className="flex-1">
          <label htmlFor="account-email" className="mb-1.5 block text-[13px] font-bold text-text">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || email === initialEmail}
          className="rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Update email"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-pop-text">
          {error}
        </p>
      )}
      {sent && (
        <p className="mt-3 text-sm text-success">
          Check {email} for a verification link to confirm the change.
        </p>
      )}
    </section>
  );
}
