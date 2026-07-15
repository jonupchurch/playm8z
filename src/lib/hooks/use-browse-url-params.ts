"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Shared by search-header.tsx, filter-sidebar.tsx, and active-pills.tsx --
// Browse's facet state lives entirely in the URL's search params
// (research.md #1), so every control just reads/writes the same
// searchParams rather than sharing local React state.
export function useBrowseUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // router.replace() doesn't call history.replaceState() synchronously --
  // it dispatches to Next's internal async action-queue/reducer, which only
  // resolves (updating both window.location and this hook's own
  // `searchParams`) once React re-renders with the result. So neither
  // `searchParams` nor `window.location.search` can be trusted as the base
  // for a SECOND rapid update issued before the first one's reducer cycle
  // has completed -- two facet toggles fired back-to-back (as in
  // browse.spec.ts) would read the same not-yet-updated value and the
  // second call would silently drop the first's change. Instead, track the
  // params *this hook instance* last asked the router for, and reconcile it
  // back to `null` (defer to the real `searchParams`) once a render finally
  // reflects it -- an optimistic-local-state pattern that doesn't depend on
  // any Next.js-internal timing at all.
  const pendingRef = useRef<string | null>(null);
  const searchParamsString = searchParams.toString();
  if (pendingRef.current === searchParamsString) pendingRef.current = null;

  function replace(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(pendingRef.current ?? searchParamsString);
    mutator(params);
    const next = params.toString();
    pendingRef.current = next;
    router.replace(`${pathname}?${next}`);
  }

  return {
    searchParams,
    setSingle(key: string, value: string, defaultValue = "any") {
      replace((params) => {
        if (value === defaultValue || value === "") params.delete(key);
        else params.set(key, value);
      });
    },
    toggleMulti(key: string, value: string) {
      replace((params) => {
        const current = params.getAll(key);
        const next = current.includes(value)
          ? current.filter((existing) => existing !== value)
          : [...current, value];
        params.delete(key);
        next.forEach((v) => params.append(key, v));
      });
    },
    setQuery(value: string) {
      replace((params) => {
        if (value.trim()) params.set("q", value);
        else params.delete("q");
      });
    },
    removeValue(key: string, value?: string) {
      replace((params) => {
        if (value === undefined) {
          params.delete(key);
          return;
        }
        const next = params.getAll(key).filter((existing) => existing !== value);
        params.delete(key);
        next.forEach((v) => params.append(key, v));
      });
    },
    clearAll() {
      pendingRef.current = "";
      router.replace(pathname);
    },
  };
}
