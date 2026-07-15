"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Shared by search-header.tsx, filter-sidebar.tsx, and active-pills.tsx --
// Browse's facet state lives entirely in the URL's search params
// (research.md #1), so every control just reads/writes the same
// searchParams rather than sharing local React state.
export function useBrowseUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function replace(mutator: (params: URLSearchParams) => void) {
    // Base each update on the *live* URL, not the `searchParams` snapshot
    // captured at last render -- router.replace() only resolves that
    // snapshot on the next render, so two rapid toggles (e.g. selecting
    // two facets back-to-back, as in browse.spec.ts) would otherwise both
    // read the same stale params and the second call would silently drop
    // the first's change.
    const params = new URLSearchParams(window.location.search);
    mutator(params);
    router.replace(`${pathname}?${params.toString()}`);
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
      router.replace(pathname);
    },
  };
}
