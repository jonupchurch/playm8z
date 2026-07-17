"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";

// Same disclosure-widget pattern as notification-bell.tsx (click-outside
// + Escape both dismiss, aria-haspopup/aria-expanded) -- this is this
// app's first place a signed-in user can actually log out from.
export function ProfileMenu({
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account menu for @${handle}`}
        className="block h-8.5 w-8.5 overflow-hidden rounded-lg"
      >
        <Avatar
          avatarImage={avatarImage}
          googleImage={image}
          avatarColor={avatarColor}
          handle={handle}
          className="h-full w-full rounded-lg text-sm"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute top-11 right-0 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
        >
          <div className="border-b border-border px-4 py-2.5">
            <span className="block text-[13px] font-bold text-text">@{handle}</span>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-text-muted hover:bg-surface"
          >
            Profile
          </Link>
          <Link
            href="/inbox"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-text-muted hover:bg-surface"
          >
            Inbox
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ redirectTo: "/" })}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-pop-text hover:bg-surface"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
