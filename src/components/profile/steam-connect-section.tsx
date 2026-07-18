"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disconnectSteam } from "@/lib/actions/steam-disconnect";
import { SteamImportDialog } from "@/components/profile/steam-import-dialog";

const STATUS: Record<string, { text: string; tone: "ok" | "error" }> = {
  connected: { text: "Steam connected.", tone: "ok" },
  "verify-failed": { text: "We couldn't verify with Steam. Please try connecting again.", tone: "error" },
  "already-linked": { text: "That Steam account is already linked to another playm8z account.", tone: "error" },
};

// FR-001/FR-004/FR-008: the account-settings home for Steam. Not connected ->
// Connect (starts the OpenID handshake). Connected -> Import library (review
// + add) and Disconnect (clears the link, keeps imported games). Surfaces the
// ?steam=... status the callback redirects back with.
export function SteamConnectSection({ connected, status }: { connected: boolean; status?: string }) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const banner = status ? STATUS[status] : undefined;

  async function handleDisconnect() {
    setDisconnecting(true);
    await disconnectSteam();
    setDisconnecting(false);
    setImporting(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-6">
      <h2 className="mb-1 text-lg font-bold text-text">Steam</h2>
      <p className="mb-4 text-[13px] text-text-dim">
        Connect your Steam account to add the games you actually play to your profile. This only links Steam — it never
        changes how you sign in.
      </p>

      {banner && (
        <p
          role={banner.tone === "error" ? "alert" : "status"}
          className={`mb-4 text-[13px] ${banner.tone === "ok" ? "text-[#8fe0a3]" : "text-pop-text"}`}
        >
          {banner.text}
        </p>
      )}

      {!connected ? (
        <a
          href="/api/steam/connect"
          className="inline-block rounded-lg bg-[linear-gradient(120deg,var(--color-accent),var(--color-accent-2))] px-4.5 py-2.5 text-sm font-bold text-on-accent"
        >
          Connect Steam
        </a>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-[#8fe0a3]">✓ Connected</span>
            <button
              type="button"
              onClick={() => setImporting((v) => !v)}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-bold text-text"
            >
              {importing ? "Close" : "Import library"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-lg border border-pop/40 px-4 py-2.5 text-sm font-bold text-pop-text disabled:opacity-60"
            >
              {disconnecting ? "…" : "Disconnect"}
            </button>
          </div>
          {importing && <SteamImportDialog onDone={() => router.refresh()} />}
        </>
      )}
    </section>
  );
}
